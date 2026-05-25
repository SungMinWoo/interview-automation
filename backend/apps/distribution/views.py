import bcrypt
import jwt
import random
from datetime import timedelta

from django.conf import settings
from django.db import transaction
from django.shortcuts import get_object_or_404
from django.utils import timezone
from rest_framework import permissions, status, viewsets
from rest_framework.response import Response
from rest_framework.throttling import ScopedRateThrottle
from rest_framework.views import APIView

from apps.projects.models import Project
from apps.projects.access import get_accessible_project as get_user_project
from apps.accounts.permissions import IsProjectEditor, IsProjectEditorOrReadOnly
from apps.questionnaires.models import Question
from apps.responses.models import SurveyResponse, Answer
from .models import Employee, SurveyInvitation
from .serializers import (
    EmployeeSerializer,
    BulkEmployeeSerializer,
    SurveyInvitationSerializer,
    SurveyInfoSerializer,
    SurveyVerifySerializer,
    SurveySubmitSerializer,
    SurveyDraftSerializer,
)

import uuid


def _generate_survey_password() -> tuple[str, str]:
    """랜덤 4자리 숫자 비밀번호와 bcrypt 해시를 반환."""
    plain = ''.join(str(random.randint(0, 9)) for _ in range(4))
    hashed = bcrypt.hashpw(plain.encode('utf-8'), bcrypt.gensalt()).decode('utf-8')
    return plain, hashed


# ──────────────────────────────────────────────
# Employee views (project-nested, auth required)
# ──────────────────────────────────────────────

class EmployeeViewSet(viewsets.ModelViewSet):
    serializer_class = EmployeeSerializer
    permission_classes = [permissions.IsAuthenticated, IsProjectEditorOrReadOnly]

    def get_project(self):
        return get_user_project(self.request, self.kwargs['project_id'])

    def get_queryset(self):
        return Employee.objects.filter(
            project__pk=self.kwargs['project_id'],
        )

    def perform_create(self, serializer):
        project = self.get_project()
        instance = serializer.save(project=project)
        from apps.projects.models import log_activity
        log_activity(project, self.request.user, 'employee_added', {
            'employee_name': instance.name,
            'employee_email': instance.email,
        })

    def perform_destroy(self, instance):
        from apps.projects.models import log_activity
        project = instance.project
        log_activity(project, self.request.user, 'employee_removed', {
            'employee_name': instance.name,
        })
        instance.delete()


class BulkEmployeeCreateView(APIView):
    """POST - Accept a list of employees and create them in bulk."""
    permission_classes = [permissions.IsAuthenticated, IsProjectEditor]

    def post(self, request, project_id):
        project = get_user_project(request, project_id)
        serializer = BulkEmployeeSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        employees_data = serializer.validated_data['employees']
        created = []
        with transaction.atomic():
            for emp_data in employees_data:
                emp_data.pop('project', None)
                employee = Employee.objects.create(project=project, **emp_data)
                created.append(employee)

        return Response(
            EmployeeSerializer(created, many=True).data,
            status=status.HTTP_201_CREATED,
        )


# ──────────────────────────────────────────────
# Invitation views (project-nested, auth required)
# ──────────────────────────────────────────────

class GenerateInvitationsView(APIView):
    """POST - Create invitations for all employees that don't have one yet."""
    permission_classes = [permissions.IsAuthenticated, IsProjectEditor]

    def post(self, request, project_id):
        project = get_user_project(request, project_id)

        # 질문지가 확정되어야만 초대 링크 생성 가능
        from apps.questionnaires.models import Questionnaire
        questionnaire = Questionnaire.objects.filter(project=project).first()
        if not questionnaire or questionnaire.status != Questionnaire.Status.CONFIRMED:
            return Response(
                {'detail': '질문지가 확정된 후에만 초대 링크를 생성할 수 있습니다.'},
                status=status.HTTP_400_BAD_REQUEST,
            )

        employees = Employee.objects.filter(project=project).exclude(
            invitation__isnull=False,
        )

        expiry_days = getattr(settings, 'SURVEY_URL_EXPIRY_DAYS', 7)
        expires_at = timezone.now() + timedelta(days=expiry_days)
        created = []

        with transaction.atomic():
            for employee in employees:
                plain, password_hash = _generate_survey_password()
                invitation = SurveyInvitation.objects.create(
                    employee=employee,
                    project=project,
                    password_hash=password_hash,
                    password_plain=plain,
                    expires_at=expires_at,
                )
                created.append(invitation)

        # Ensure project is in distributing status
        if project.status == Project.Status.QUESTIONNAIRE_READY:
            project.status = Project.Status.DISTRIBUTING
            project.save(update_fields=['status', 'updated_at'])

        from apps.projects.models import log_activity
        log_activity(project, request.user, 'invitations_generated', {'count': len(created)})

        from apps.notifications.tasks import create_project_notifications
        create_project_notifications.delay(
            project_id=project.id,
            event_type='invitations_sent',
            title=f'{project.title} — 설문 초대가 생성되었습니다 ({len(created)}명)',
            exclude_user_id=request.user.id,
            actor_id=request.user.id,
        )

        return Response(
            {
                'created_count': len(created),
                'invitations': SurveyInvitationSerializer(created, many=True).data,
            },
            status=status.HTTP_201_CREATED,
        )


class RegenerateInvitationView(APIView):
    """POST - Regenerate invitation for a specific employee."""
    permission_classes = [permissions.IsAuthenticated, IsProjectEditor]

    def post(self, request, project_id, employee_id):
        project = get_user_project(request, project_id)
        employee = get_object_or_404(Employee, pk=employee_id, project=project)

        # Delete old invitation if exists
        SurveyInvitation.objects.filter(employee=employee).delete()

        expiry_days = getattr(settings, 'SURVEY_URL_EXPIRY_DAYS', 7)
        expires_at = timezone.now() + timedelta(days=expiry_days)

        plain, password_hash = _generate_survey_password()

        invitation = SurveyInvitation.objects.create(
            employee=employee,
            project=project,
            password_hash=password_hash,
            password_plain=plain,
            expires_at=expires_at,
        )

        from apps.projects.models import log_activity
        log_activity(project, request.user, 'invitation_regenerated', {
            'employee_name': employee.name,
        })

        return Response(
            SurveyInvitationSerializer(invitation).data,
            status=status.HTTP_201_CREATED,
        )


class SendInvitationsView(APIView):
    """POST - Trigger email sending via Celery for pending invitations."""
    permission_classes = [permissions.IsAuthenticated, IsProjectEditor]

    def post(self, request, project_id):
        project = get_user_project(request, project_id)
        pending = SurveyInvitation.objects.filter(
            project=project,
            status=SurveyInvitation.Status.PENDING,
        )
        count = pending.count()

        if count == 0:
            return Response(
                {'detail': 'No pending invitations to send.'},
                status=status.HTTP_400_BAD_REQUEST,
            )

        from .tasks import send_invitation_emails
        invitation_ids = list(pending.values_list('id', flat=True))
        send_invitation_emails.delay(invitation_ids)

        # Advance project status to collecting
        if project.status in (Project.Status.DISTRIBUTING, Project.Status.QUESTIONNAIRE_READY):
            project.status = Project.Status.COLLECTING
            project.save(update_fields=['status', 'updated_at'])

        from apps.projects.models import log_activity
        log_activity(project, request.user, 'invitations_sent', {'count': count})

        return Response(
            {'detail': f'Sending {count} invitation(s).', 'count': count},
            status=status.HTTP_202_ACCEPTED,
        )


class InvitationListView(APIView):
    """GET - List all invitations for a project."""
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request, project_id):
        project = get_user_project(request, project_id)
        invitations = SurveyInvitation.objects.filter(project=project).select_related(
            'employee',
        )
        serializer = SurveyInvitationSerializer(invitations, many=True)
        return Response(serializer.data)


class ResendInvitationView(APIView):
    """POST - Resend a single invitation email."""
    permission_classes = [permissions.IsAuthenticated, IsProjectEditor]

    def post(self, request, project_id, invitation_pk):
        project = get_user_project(request, project_id)
        invitation = get_object_or_404(
            SurveyInvitation, pk=invitation_pk, project=project,
        )

        from .tasks import send_invitation_emails
        send_invitation_emails.delay([invitation.id])

        from apps.projects.models import log_activity
        log_activity(project, request.user, 'invitation_resent', {
            'employee_name': invitation.employee.name,
        })

        return Response(
            {'detail': 'Invitation resend triggered.'},
            status=status.HTTP_202_ACCEPTED,
        )


# ──────────────────────────────────────────────
# Public survey views (NO auth required)
# ──────────────────────────────────────────────

def _get_invitation_by_token(token):
    return get_object_or_404(
        SurveyInvitation.objects.select_related('employee', 'project'),
        token=token,
    )


def _create_survey_jwt(invitation):
    """Create a short-lived JWT for survey access."""
    payload = {
        'token': str(invitation.token),
        'exp': timezone.now() + timedelta(minutes=30),
        'iat': timezone.now(),
        'type': 'survey',
    }
    return jwt.encode(payload, settings.SECRET_KEY, algorithm='HS256')


def _verify_survey_jwt(request):
    """Verify survey JWT from Authorization header. Returns invitation or None."""
    auth_header = request.headers.get('Authorization', '')
    if not auth_header.startswith('Bearer '):
        return None

    token_str = auth_header.split(' ', 1)[1]
    try:
        payload = jwt.decode(token_str, settings.SECRET_KEY, algorithms=['HS256'])
    except (jwt.ExpiredSignatureError, jwt.InvalidTokenError):
        return None

    if payload.get('type') != 'survey':
        return None

    try:
        invitation = SurveyInvitation.objects.select_related(
            'employee', 'project',
        ).get(token=payload['token'])
    except SurveyInvitation.DoesNotExist:
        return None

    return invitation


class SurveyInfoView(APIView):
    """GET /api/v1/survey/<token>/ - Basic info, no password needed."""
    permission_classes = [permissions.AllowAny]
    authentication_classes = []

    def get(self, request, token):
        invitation = _get_invitation_by_token(token)
        # 메일과 동일한 prefix 제거 처리를 거쳐 일관된 제목을 노출
        from services.email_service import _clean_project_title
        data = SurveyInfoSerializer({
            'project_title': _clean_project_title(invitation.project.title),
            'employee_name': invitation.employee.name,
            'status': invitation.status,
            'is_expired': invitation.is_expired,
            'interview_purpose': invitation.project.interview_purpose or '',
        }).data
        return Response(data)


class SurveyVerifyView(APIView):
    """POST /api/v1/survey/<token>/verify/ - Verify password, return JWT."""
    permission_classes = [permissions.AllowAny]
    authentication_classes = []
    throttle_classes = [ScopedRateThrottle]
    throttle_scope = 'survey_verify'

    def post(self, request, token):
        invitation = _get_invitation_by_token(token)

        if invitation.is_expired:
            return Response(
                {'detail': 'This survey link has expired.'},
                status=status.HTTP_410_GONE,
            )

        serializer = SurveyVerifySerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        password = serializer.validated_data['password']
        if not bcrypt.checkpw(
            password.encode('utf-8'),
            invitation.password_hash.encode('utf-8'),
        ):
            return Response(
                {'detail': 'Invalid password.'},
                status=status.HTTP_401_UNAUTHORIZED,
            )

        # Mark as opened
        if invitation.status == SurveyInvitation.Status.PENDING or \
                invitation.status == SurveyInvitation.Status.SENT:
            invitation.status = SurveyInvitation.Status.OPENED
            invitation.opened_at = timezone.now()
            invitation.save(update_fields=['status', 'opened_at'])

        access_token = _create_survey_jwt(invitation)
        return Response({'access_token': access_token})


class SurveyQuestionsView(APIView):
    """GET /api/v1/survey/<token>/questions/ - Questions filtered by position_category."""
    permission_classes = [permissions.AllowAny]
    authentication_classes = []

    def get(self, request, token):
        invitation = _verify_survey_jwt(request)
        if not invitation or str(invitation.token) != str(token):
            return Response(
                {'detail': 'Invalid or expired survey token.'},
                status=status.HTTP_401_UNAUTHORIZED,
            )

        employee = invitation.employee
        questionnaire = getattr(invitation.project, 'questionnaire', None)
        if not questionnaire:
            return Response(
                {'detail': 'No questionnaire configured for this project.'},
                status=status.HTTP_404_NOT_FOUND,
            )

        # Get all questions, then filter by employee's position matching section targets
        questions = Question.objects.filter(questionnaire=questionnaire).select_related('section')

        # Find employee's matching ProjectPosition and ProjectDepartment
        from apps.projects.models import ProjectPosition, ProjectDepartment
        emp_position = None
        emp_department = None
        if employee.position:
            emp_position = ProjectPosition.objects.filter(
                project=invitation.project, name=employee.position,
            ).first()
        if employee.department:
            emp_department = ProjectDepartment.objects.filter(
                project=invitation.project, name=employee.department,
            ).first()

        filtered_questions = []
        for q in questions.order_by('order'):
            # Check section-level target_positions
            if q.section and q.section.target_positions.exists():
                if not (emp_position and q.section.target_positions.filter(pk=emp_position.pk).exists()):
                    continue

            # Check question-level target_positions
            if q.target_positions.exists():
                if not (emp_position and q.target_positions.filter(pk=emp_position.pk).exists()):
                    continue

            # Check question-level target_departments
            if q.target_departments.exists():
                if not (emp_department and q.target_departments.filter(pk=emp_department.pk).exists()):
                    continue

            filtered_questions.append(q)

        data = []
        for q in filtered_questions:
            data.append({
                'id': q.id,
                'text': q.text,
                'description': q.description,
                'question_type': q.question_type,
                'importance': q.importance,
                'order': q.order,
                'options': q.options,
                'section': q.section.title if q.section else None,
            })

        return Response(data)


class SurveySubmitView(APIView):
    """POST /api/v1/survey/<token>/submit/ - Submit all answers."""
    permission_classes = [permissions.AllowAny]
    authentication_classes = []

    def post(self, request, token):
        invitation = _verify_survey_jwt(request)
        if not invitation or str(invitation.token) != str(token):
            return Response(
                {'detail': 'Invalid or expired survey token.'},
                status=status.HTTP_401_UNAUTHORIZED,
            )

        if invitation.status == SurveyInvitation.Status.COMPLETED:
            return Response(
                {'detail': 'Survey already completed.'},
                status=status.HTTP_400_BAD_REQUEST,
            )

        serializer = SurveySubmitSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        with transaction.atomic():
            response_obj, _ = SurveyResponse.objects.get_or_create(
                invitation=invitation,
                defaults={
                    'project': invitation.project,
                    'employee': invitation.employee,
                },
            )
            # Clear existing answers (in case of draft -> submit)
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

            invitation.status = SurveyInvitation.Status.COMPLETED
            invitation.completed_at = timezone.now()
            # 응답 완료 이후엔 평문 비밀번호가 더 이상 필요 없으므로 폐기 (해시는 유지).
            invitation.password_plain = ''
            invitation.save(update_fields=['status', 'completed_at', 'password_plain'])

        return Response({'detail': 'Survey submitted successfully.'})


class SurveyDraftView(APIView):
    """PATCH /api/v1/survey/<token>/draft/ - Auto-save progress."""
    permission_classes = [permissions.AllowAny]
    authentication_classes = []

    def patch(self, request, token):
        invitation = _verify_survey_jwt(request)
        if not invitation or str(invitation.token) != str(token):
            return Response(
                {'detail': 'Invalid or expired survey token.'},
                status=status.HTTP_401_UNAUTHORIZED,
            )

        if invitation.status == SurveyInvitation.Status.COMPLETED:
            return Response(
                {'detail': 'Survey already completed.'},
                status=status.HTTP_400_BAD_REQUEST,
            )

        serializer = SurveyDraftSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        with transaction.atomic():
            response_obj, _ = SurveyResponse.objects.get_or_create(
                invitation=invitation,
                defaults={
                    'project': invitation.project,
                    'employee': invitation.employee,
                },
            )

            for ans_data in serializer.validated_data['answers']:
                Answer.objects.update_or_create(
                    response=response_obj,
                    question_id=ans_data['question_id'],
                    defaults={
                        'text_value': ans_data.get('text_value', ''),
                        'choice_values': ans_data.get('choice_values', []),
                        'rating_value': ans_data.get('rating_value'),
                    },
                )

        return Response({'detail': 'Draft saved.'})
