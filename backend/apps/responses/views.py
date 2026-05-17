import bcrypt
from datetime import timedelta

from django.db import transaction
from django.shortcuts import get_object_or_404
from django.utils import timezone
from rest_framework import permissions, status
from rest_framework.response import Response
from rest_framework.views import APIView

from apps.projects.models import Project
from apps.projects.access import get_accessible_project as get_user_project
from apps.accounts.permissions import IsProjectEditor
from apps.distribution.models import Employee, SurveyInvitation
from .models import SurveyResponse, Answer, ManualEntryDraft, ManualEntryDraftAnswer
from .serializers import (
    SurveyResponseListSerializer,
    SurveyResponseDetailSerializer,
    ManualEntryStartSerializer,
    ManualEntrySubmitSerializer,
    AnswerSerializer,
    ManualEntryDraftSerializer,
    ManualEntryDraftListSerializer,
    ManualEntryMergeSerializer,
)


# ──────────────────────────────────────────────
# Response views (project-nested, auth required)
# ──────────────────────────────────────────────

class ResponseListView(APIView):
    """GET - All responses for a project with status."""
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request, project_id):
        project = get_user_project(request, project_id)
        responses = SurveyResponse.objects.filter(project=project).select_related(
            'employee', 'invitation',
        )
        serializer = SurveyResponseListSerializer(responses, many=True)
        return Response(serializer.data)


class ResponseDetailView(APIView):
    """GET - Single response with all answers."""
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request, project_id, response_pk):
        project = get_user_project(request, project_id)
        response_obj = get_object_or_404(
            SurveyResponse.objects.select_related('employee').prefetch_related(
                'answers__question',
            ),
            pk=response_pk,
            project=project,
        )
        serializer = SurveyResponseDetailSerializer(response_obj)
        return Response(serializer.data)


class CloseCollectionView(APIView):
    """POST - Close response collection, update project status to CLOSED."""
    permission_classes = [permissions.IsAuthenticated, IsProjectEditor]

    def post(self, request, project_id):
        project = get_user_project(request, project_id)

        # Allow closing from most active states; only block if already fully completed
        if project.status in (Project.Status.CLOSED, Project.Status.COMPLETED):
            return Response(
                {'detail': 'Project is already closed or completed.'},
                status=status.HTTP_400_BAD_REQUEST,
            )

        # Expire all pending/sent invitations
        SurveyInvitation.objects.filter(
            project=project,
            status__in=[SurveyInvitation.Status.PENDING, SurveyInvitation.Status.SENT],
        ).update(status=SurveyInvitation.Status.EXPIRED)

        project.status = Project.Status.CLOSED
        project.save(update_fields=['status', 'updated_at'])

        from apps.projects.models import log_activity
        log_activity(project, request.user, 'collection_closed')

        from apps.notifications.tasks import create_project_notifications
        create_project_notifications.delay(
            project_id=project.id,
            event_type='collection_closed',
            title=f'{project.title} — 응답 수집이 마감되었습니다',
            exclude_user_id=request.user.id,
            actor_id=request.user.id,
        )

        return Response({'detail': 'Response collection closed.', 'status': project.status})


# ──────────────────────────────────────────────
# Manual entry views (project-nested, auth required)
# ──────────────────────────────────────────────

class ManualEntryStartView(APIView):
    """POST - Create a manual entry session for an employee."""
    permission_classes = [permissions.IsAuthenticated, IsProjectEditor]

    def post(self, request, project_id):
        project = get_user_project(request, project_id)
        serializer = ManualEntryStartSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        employee_id = serializer.validated_data['employee_id']
        employee = get_object_or_404(Employee, pk=employee_id, project=project)

        # Create or get invitation for manual entry
        invitation, inv_created = SurveyInvitation.objects.get_or_create(
            employee=employee,
            defaults={
                'project': project,
                'password_hash': '',
                'expires_at': timezone.now() + timedelta(days=365),
                'is_manual_entry': True,
                'status': SurveyInvitation.Status.OPENED,
                'opened_at': timezone.now(),
            },
        )

        if not inv_created and not invitation.is_manual_entry:
            invitation.is_manual_entry = True
            invitation.save(update_fields=['is_manual_entry'])

        # Create response
        response_obj, created = SurveyResponse.objects.get_or_create(
            invitation=invitation,
            defaults={
                'project': project,
                'employee': employee,
                'is_manual': True,
                'entered_by': request.user,
            },
        )

        if not created:
            return Response(
                {
                    'detail': 'A response already exists for this employee.',
                    'response_id': response_obj.id,
                },
                status=status.HTTP_200_OK,
            )

        return Response(
            {
                'detail': 'Manual entry session created.',
                'response_id': response_obj.id,
                'employee_name': employee.name,
            },
            status=status.HTTP_201_CREATED,
        )


class ManualEntrySubmitView(APIView):
    """POST - Submit manually entered answers."""
    permission_classes = [permissions.IsAuthenticated, IsProjectEditor]

    def post(self, request, project_id):
        project = get_user_project(request, project_id)
        serializer = ManualEntrySubmitSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        response_id = serializer.validated_data['response_id']
        response_obj = get_object_or_404(
            SurveyResponse, pk=response_id, project=project, is_manual=True,
        )

        if response_obj.completed_at:
            return Response(
                {'detail': 'This manual entry has already been submitted.'},
                status=status.HTTP_400_BAD_REQUEST,
            )

        with transaction.atomic():
            # Clear any existing draft answers
            response_obj.answers.all().delete()

            for ans_data in serializer.validated_data['answers']:
                Answer.objects.create(
                    response=response_obj,
                    question_id=ans_data['question_id'],
                    text_value=ans_data.get('text_value', ''),
                    choice_values=ans_data.get('choice_values', []),
                    rating_value=ans_data.get('rating_value'),
                )

            response_obj.completed_at = timezone.now()
            response_obj.save(update_fields=['completed_at'])

            # Update invitation status
            invitation = response_obj.invitation
            invitation.status = SurveyInvitation.Status.COMPLETED
            invitation.completed_at = timezone.now()
            # 평문 비밀번호는 답변 완료 후 폐기 (해시는 유지).
            invitation.password_plain = ''
            invitation.save(update_fields=['status', 'completed_at', 'password_plain'])

        return Response({'detail': 'Manual entry submitted successfully.'})


# ──────────────────────────────────────────────
# 대면 인터뷰 멤버별 draft
# ──────────────────────────────────────────────

class MyManualDraftView(APIView):
    """GET/POST - 내 draft 조회/생성. ?employee_id=N 필수."""
    permission_classes = [permissions.IsAuthenticated, IsProjectEditor]

    def _get_employee(self, request, project_id):
        project = get_user_project(request, project_id)
        employee_id = request.query_params.get('employee_id') or request.data.get('employee_id')
        if not employee_id:
            return None, project, Response(
                {'detail': 'employee_id is required.'},
                status=status.HTTP_400_BAD_REQUEST,
            )
        employee = get_object_or_404(Employee, pk=employee_id, project=project)
        return employee, project, None

    def get(self, request, project_id):
        employee, project, err = self._get_employee(request, project_id)
        if err:
            return err
        try:
            draft = ManualEntryDraft.objects.get(
                project=project, employee=employee, author=request.user,
            )
        except ManualEntryDraft.DoesNotExist:
            return Response({'detail': 'No draft yet.', 'draft': None}, status=status.HTTP_200_OK)
        return Response(ManualEntryDraftSerializer(draft).data)

    def post(self, request, project_id):
        employee, project, err = self._get_employee(request, project_id)
        if err:
            return err
        draft, _ = ManualEntryDraft.objects.get_or_create(
            project=project, employee=employee, author=request.user,
        )
        return Response(
            ManualEntryDraftSerializer(draft).data,
            status=status.HTTP_201_CREATED,
        )


class ManualDraftDetailView(APIView):
    """PATCH/DELETE - 내 draft 답변 자동 저장 / 삭제. 본인 draft만 접근 가능."""
    permission_classes = [permissions.IsAuthenticated, IsProjectEditor]

    def _get_draft(self, request, project_id, draft_id):
        project = get_user_project(request, project_id)
        draft = get_object_or_404(ManualEntryDraft, pk=draft_id, project=project)
        if draft.author_id != request.user.id:
            from rest_framework.exceptions import PermissionDenied
            raise PermissionDenied('본인 draft만 수정할 수 있습니다.')
        return draft

    def patch(self, request, project_id, draft_id):
        draft = self._get_draft(request, project_id, draft_id)
        if draft.is_submitted:
            return Response(
                {'detail': '제출된 draft는 수정할 수 없습니다.'},
                status=status.HTTP_400_BAD_REQUEST,
            )
        answers = request.data.get('answers', [])
        with transaction.atomic():
            for ans in answers:
                qid = ans.get('question_id')
                if not qid:
                    continue
                ManualEntryDraftAnswer.objects.update_or_create(
                    draft=draft, question_id=qid,
                    defaults={
                        'text_value': ans.get('text_value', ''),
                        'choice_values': ans.get('choice_values', []),
                        'rating_value': ans.get('rating_value'),
                    },
                )
            draft.save()  # updated_at 갱신
        return Response(ManualEntryDraftSerializer(draft).data)

    def delete(self, request, project_id, draft_id):
        draft = self._get_draft(request, project_id, draft_id)
        if draft.is_submitted:
            return Response(
                {'detail': '제출된 draft는 삭제할 수 없습니다.'},
                status=status.HTTP_400_BAD_REQUEST,
            )
        draft.delete()
        return Response(status=status.HTTP_204_NO_CONTENT)


class ManualDraftSubmitView(APIView):
    """POST - 본인 draft 작성 완료 표시."""
    permission_classes = [permissions.IsAuthenticated, IsProjectEditor]

    def post(self, request, project_id, draft_id):
        project = get_user_project(request, project_id)
        draft = get_object_or_404(ManualEntryDraft, pk=draft_id, project=project)
        if draft.author_id != request.user.id:
            from rest_framework.exceptions import PermissionDenied
            raise PermissionDenied('본인 draft만 제출할 수 있습니다.')

        draft.is_submitted = True
        draft.submitted_at = timezone.now()
        draft.save(update_fields=['is_submitted', 'submitted_at', 'updated_at'])
        return Response(ManualEntryDraftSerializer(draft).data)


class EmployeeManualDraftsView(APIView):
    """GET - 한 인터뷰이에 대한 모든 멤버의 draft 목록 + 머지된 SurveyResponse 존재 여부."""
    permission_classes = [permissions.IsAuthenticated, IsProjectEditor]

    def get(self, request, project_id, employee_id):
        project = get_user_project(request, project_id)
        employee = get_object_or_404(Employee, pk=employee_id, project=project)
        drafts = ManualEntryDraft.objects.filter(
            project=project, employee=employee,
        ).select_related('author').order_by('-updated_at')
        merged = SurveyResponse.objects.filter(
            project=project, employee=employee, is_manual=True,
        ).first()
        return Response({
            'employee_id': employee.id,
            'employee_name': employee.name,
            'drafts': ManualEntryDraftListSerializer(drafts, many=True).data,
            'merged_response_id': merged.id if merged else None,
            'merged_at': merged.completed_at if merged else None,
        })


class EmployeeManualDraftsDetailView(APIView):
    """GET - 한 인터뷰이의 모든 draft을 answers까지 포함해서 반환 (머지 화면용)."""
    permission_classes = [permissions.IsAuthenticated, IsProjectEditor]

    def get(self, request, project_id, employee_id):
        project = get_user_project(request, project_id)
        employee = get_object_or_404(Employee, pk=employee_id, project=project)
        drafts = ManualEntryDraft.objects.filter(
            project=project, employee=employee,
        ).select_related('author').prefetch_related('answers').order_by('-updated_at')
        return Response({
            'employee_id': employee.id,
            'employee_name': employee.name,
            'drafts': ManualEntryDraftSerializer(drafts, many=True).data,
        })


class ManualAiMergeView(APIView):
    """POST - 특정 질문에 대해 멤버 draft 답변들을 AI가 합쳐서 텍스트로 반환.

    body: {question_id: int, ai_provider?: 'claude'|'gemini'}
    """
    permission_classes = [permissions.IsAuthenticated, IsProjectEditor]

    def post(self, request, project_id, employee_id):
        project = get_user_project(request, project_id)
        employee = get_object_or_404(Employee, pk=employee_id, project=project)

        question_id = request.data.get('question_id')
        if not question_id:
            return Response({'detail': 'question_id is required.'}, status=status.HTTP_400_BAD_REQUEST)

        from apps.questionnaires.models import Question
        question = get_object_or_404(Question, pk=question_id)

        # 해당 인터뷰이의 모든 draft에서 이 질문의 답변 수집
        drafts = ManualEntryDraft.objects.filter(
            project=project, employee=employee,
        ).select_related('author').prefetch_related('answers')

        member_answers = []  # (author_name, text)
        for d in drafts:
            ans = d.answers.filter(question_id=question_id).first()
            if not ans:
                continue
            text = ans.text_value
            if not text and ans.choice_values:
                text = ', '.join(ans.choice_values)
            if not text and ans.rating_value is not None:
                text = f'{ans.rating_value}점'
            if not text:
                continue
            author_name = (
                d.author.first_name
                or d.author.username
                or d.author.email
                or f'User {d.author_id}'
            )
            member_answers.append((author_name, text))

        if not member_answers:
            return Response(
                {'detail': '합칠 답변이 없습니다. 멤버가 메모를 먼저 작성해야 합니다.'},
                status=status.HTTP_400_BAD_REQUEST,
            )

        # 프롬프트 구성 — 가벼운 요약·통합 요청
        from services.ai_client import get_ai_client, validate_ai_provider
        ai_provider = validate_ai_provider(request.data.get('ai_provider'))
        client = get_ai_client(ai_provider)

        notes_block = '\n\n'.join(
            f'[{name}]\n{text}' for name, text in member_answers
        )
        prompt = (
            '다음은 한 인터뷰이에 대해 여러 멤버가 같은 질문에 대해 작성한 메모입니다.\n'
            '메모들의 핵심을 잃지 않으면서 자연스러운 한 문단으로 합쳐주세요.\n'
            '중복은 합치고, 멤버 이름은 본문에 노출하지 마세요. 한국어로 간결하게.\n\n'
            f'## 질문\n{question.text}\n\n'
            f'## 멤버 메모\n{notes_block}\n\n'
            '## 합쳐진 답변 (텍스트만 출력, 다른 설명 X)'
        )

        try:
            merged_text = client._request_text(prompt, temperature=0.4).strip()
        except Exception as e:
            return Response(
                {'detail': f'AI 호출에 실패했습니다: {e}'},
                status=status.HTTP_502_BAD_GATEWAY,
            )

        return Response({
            'question_id': question_id,
            'merged_text': merged_text,
            'source_count': len(member_answers),
            'ai_provider': ai_provider,
        })


class ManualMergeView(APIView):
    """POST - 멤버 draft들을 토대로 작성된 최종 답변으로 공식 SurveyResponse 생성/덮어쓰기.

    body: {answers: [{question_id, text_value, choice_values, rating_value}]}
    """
    permission_classes = [permissions.IsAuthenticated, IsProjectEditor]

    def post(self, request, project_id, employee_id):
        project = get_user_project(request, project_id)
        employee = get_object_or_404(Employee, pk=employee_id, project=project)

        serializer = ManualEntryMergeSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        answers = serializer.validated_data['answers']

        with transaction.atomic():
            # 머지된 SurveyResponse를 위한 invitation 확보 (is_manual_entry=True)
            invitation, _ = SurveyInvitation.objects.get_or_create(
                employee=employee,
                defaults={
                    'project': project,
                    'password_hash': '',
                    'expires_at': timezone.now() + timedelta(days=365),
                    'is_manual_entry': True,
                    'status': SurveyInvitation.Status.COMPLETED,
                },
            )
            if not invitation.is_manual_entry:
                invitation.is_manual_entry = True
                invitation.save(update_fields=['is_manual_entry'])

            # 기존 머지 응답이 있으면 답변 갈아끼우기 (재머지 가능)
            response_obj, created = SurveyResponse.objects.get_or_create(
                invitation=invitation,
                defaults={
                    'project': project,
                    'employee': employee,
                    'is_manual': True,
                    'entered_by': request.user,
                },
            )
            if not created:
                response_obj.answers.all().delete()
                response_obj.entered_by = request.user
                response_obj.save(update_fields=['entered_by'])

            for ans in answers:
                Answer.objects.create(
                    response=response_obj,
                    question_id=ans['question_id'],
                    text_value=ans.get('text_value', ''),
                    choice_values=ans.get('choice_values', []),
                    rating_value=ans.get('rating_value'),
                )

            response_obj.completed_at = timezone.now()
            response_obj.save(update_fields=['completed_at'])

            invitation.status = SurveyInvitation.Status.COMPLETED
            invitation.completed_at = timezone.now()
            invitation.save(update_fields=['status', 'completed_at'])

        return Response({
            'detail': '머지된 응답이 저장되었습니다.',
            'response_id': response_obj.id,
        })
