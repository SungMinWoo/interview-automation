from django.db import transaction
from django.shortcuts import get_object_or_404
from rest_framework import permissions, status, viewsets
from rest_framework.response import Response
from rest_framework.views import APIView

from apps.projects.models import Project
from apps.projects.access import get_accessible_project as get_user_project
from apps.accounts.permissions import IsProjectEditor, IsProjectEditorOrReadOnly
from services.ai_client import validate_ai_provider
from .models import Questionnaire, QuestionSection, Question, PositionCategory
from .serializers import (
    QuestionnaireSerializer,
    QuestionnaireStatusSerializer,
    QuestionSectionSerializer,
    QuestionSerializer,
    PositionCategorySerializer,
    QuestionReorderSerializer,
)


def get_user_questionnaire(request, project_id):
    """Return the questionnaire for a project owned by the user or 404."""
    project = get_user_project(request, project_id)
    return get_object_or_404(Questionnaire, project=project)


class GenerateQuestionnaireView(APIView):
    """POST - Trigger AI generation of a questionnaire."""

    permission_classes = [permissions.IsAuthenticated, IsProjectEditor]

    def post(self, request, project_id):
        project = get_user_project(request, project_id)
        ai_provider = validate_ai_provider(request.data.get('ai_provider'))

        questionnaire, created = Questionnaire.objects.get_or_create(
            project=project,
            defaults={
                'title': f'{project.title} 질문지',
                'ai_provider': ai_provider,
                'status': Questionnaire.Status.PENDING,
            },
        )

        if not created:
            if questionnaire.status == Questionnaire.Status.CONFIRMED:
                return Response(
                    {'detail': '질문지가 확정되어 추가 생성할 수 없습니다.'},
                    status=status.HTTP_400_BAD_REQUEST,
                )
            if questionnaire.status == Questionnaire.Status.PROCESSING:
                return Response(
                    {'detail': 'Questionnaire generation is already in progress.'},
                    status=status.HTTP_409_CONFLICT,
                )
            questionnaire.ai_provider = ai_provider
            questionnaire.status = Questionnaire.Status.PENDING
            questionnaire.error_message = ''
            questionnaire.save(update_fields=['ai_provider', 'status', 'error_message', 'updated_at'])

        # Trigger async generation
        reference_project_ids = request.data.get('reference_project_ids', [])
        from .tasks import generate_questionnaire
        generate_questionnaire.delay(questionnaire.id, ai_provider=ai_provider, reference_project_ids=reference_project_ids)

        from apps.projects.models import log_activity
        log_activity(project, request.user, 'questionnaire_generate_triggered', {'ai_provider': ai_provider, 'reference_count': len(reference_project_ids)})

        return Response(
            QuestionnaireSerializer(questionnaire).data,
            status=status.HTTP_202_ACCEPTED,
        )


class QuestionnaireConfirmView(APIView):
    """POST - Confirm the questionnaire (sets status=confirmed)."""

    permission_classes = [permissions.IsAuthenticated, IsProjectEditor]

    def post(self, request, project_id):
        questionnaire = get_user_questionnaire(request, project_id)

        if questionnaire.questions.count() == 0:
            return Response(
                {'detail': 'Cannot confirm an empty questionnaire.'},
                status=status.HTTP_400_BAD_REQUEST,
            )

        questionnaire.status = Questionnaire.Status.CONFIRMED
        questionnaire.save(update_fields=['status', 'updated_at'])

        # Advance project status to distributing
        project = questionnaire.project
        project.status = Project.Status.DISTRIBUTING
        project.save(update_fields=['status', 'updated_at'])

        from apps.projects.models import log_activity
        log_activity(project, request.user, 'questionnaire_confirmed')

        from apps.notifications.tasks import create_project_notifications
        create_project_notifications.delay(
            project_id=project.id,
            event_type='questionnaire_confirmed',
            title=f'{project.title} — 질문지가 확정되었습니다',
            exclude_user_id=request.user.id,
            actor_id=request.user.id,
        )

        return Response(QuestionnaireSerializer(questionnaire).data)


class QuestionnaireStatusView(APIView):
    """GET - Return current questionnaire generation status for polling."""

    permission_classes = [permissions.IsAuthenticated]

    def get(self, request, project_id):
        questionnaire = get_user_questionnaire(request, project_id)
        return Response(QuestionnaireStatusSerializer(questionnaire).data)


class QuestionnaireDetailView(APIView):
    """GET/PATCH - Retrieve or update a questionnaire."""

    permission_classes = [permissions.IsAuthenticated, IsProjectEditorOrReadOnly]

    def get(self, request, project_id):
        questionnaire = get_user_questionnaire(request, project_id)
        return Response(QuestionnaireSerializer(questionnaire).data)

    def patch(self, request, project_id):
        questionnaire = get_user_questionnaire(request, project_id)
        serializer = QuestionnaireSerializer(
            questionnaire, data=request.data, partial=True,
        )
        serializer.is_valid(raise_exception=True)
        serializer.save()
        return Response(QuestionnaireSerializer(questionnaire).data)


class QuestionViewSet(viewsets.ModelViewSet):
    """CRUD for questions within a questionnaire."""

    permission_classes = [permissions.IsAuthenticated, IsProjectEditorOrReadOnly]
    serializer_class = QuestionSerializer

    def get_questionnaire(self):
        project = get_user_project(self.request, self.kwargs['project_id'])
        return get_object_or_404(Questionnaire, project=project)

    def _check_not_confirmed(self):
        questionnaire = self.get_questionnaire()
        if questionnaire.status == Questionnaire.Status.CONFIRMED:
            from rest_framework.exceptions import PermissionDenied
            raise PermissionDenied('질문지가 확정되어 수정할 수 없습니다.')
        return questionnaire

    def get_queryset(self):
        questionnaire = self.get_questionnaire()
        return Question.objects.filter(questionnaire=questionnaire)

    def perform_create(self, serializer):
        questionnaire = self._check_not_confirmed()
        serializer.save(questionnaire=questionnaire)

    def perform_update(self, serializer):
        self._check_not_confirmed()
        serializer.save()

    def perform_destroy(self, instance):
        self._check_not_confirmed()
        instance.delete()


class QuestionReorderView(APIView):
    """POST - Bulk reorder questions. Accepts list of {id, order}."""

    permission_classes = [permissions.IsAuthenticated, IsProjectEditor]

    def post(self, request, project_id):
        questionnaire = get_user_questionnaire(request, project_id)

        if questionnaire.status == Questionnaire.Status.CONFIRMED:
            return Response(
                {'detail': '질문지가 확정되어 순서를 변경할 수 없습니다.'},
                status=status.HTTP_400_BAD_REQUEST,
            )

        serializer = QuestionReorderSerializer(data=request.data, many=True)
        serializer.is_valid(raise_exception=True)

        question_ids = [item['id'] for item in serializer.validated_data]
        questions = Question.objects.filter(
            questionnaire=questionnaire, id__in=question_ids,
        )

        if questions.count() != len(question_ids):
            return Response(
                {'detail': 'One or more question IDs are invalid.'},
                status=status.HTTP_400_BAD_REQUEST,
            )

        order_map = {item['id']: item['order'] for item in serializer.validated_data}

        with transaction.atomic():
            for question in questions:
                question.order = order_map[question.id]
                question.save(update_fields=['order', 'updated_at'])

        return Response({'detail': 'Questions reordered successfully.'})


class QuestionSectionViewSet(viewsets.ModelViewSet):
    """CRUD for sections within a questionnaire."""

    permission_classes = [permissions.IsAuthenticated, IsProjectEditorOrReadOnly]
    serializer_class = QuestionSectionSerializer

    def get_questionnaire(self):
        project = get_user_project(self.request, self.kwargs['project_id'])
        return get_object_or_404(Questionnaire, project=project)

    def _check_not_confirmed(self):
        questionnaire = self.get_questionnaire()
        if questionnaire.status == Questionnaire.Status.CONFIRMED:
            from rest_framework.exceptions import PermissionDenied
            raise PermissionDenied('질문지가 확정되어 수정할 수 없습니다.')
        return questionnaire

    def get_queryset(self):
        questionnaire = self.get_questionnaire()
        return QuestionSection.objects.filter(questionnaire=questionnaire)

    def perform_create(self, serializer):
        questionnaire = self._check_not_confirmed()
        serializer.save(questionnaire=questionnaire)

    def perform_update(self, serializer):
        self._check_not_confirmed()
        serializer.save()

    def perform_destroy(self, instance):
        self._check_not_confirmed()
        instance.delete()


class GenerateSectionQuestionsView(APIView):
    """POST - Generate AI questions for a specific section."""

    permission_classes = [permissions.IsAuthenticated, IsProjectEditor]

    def post(self, request, project_id, section_id):
        project = get_user_project(request, project_id)
        questionnaire = get_object_or_404(Questionnaire, project=project)

        if questionnaire.status == Questionnaire.Status.CONFIRMED:
            return Response(
                {'detail': '질문지가 확정되어 추가 생성할 수 없습니다.'},
                status=status.HTTP_400_BAD_REQUEST,
            )

        section = get_object_or_404(QuestionSection, pk=section_id, questionnaire=questionnaire)
        count = int(request.data.get('count', 3))
        count = max(1, min(count, 10))  # Clamp 1-10
        ai_provider = validate_ai_provider(request.data.get('ai_provider'))

        # Get analysis context
        analysis_data = {}
        if hasattr(project, 'analysis') and project.analysis:
            a = project.analysis
            analysis_data = {
                'requirements_summary': a.requirements_summary,
                'combined_insights': a.combined_insights,
            }

        # Existing questions in this section
        existing_questions = list(section.questions.values_list('text', flat=True))

        from services.ai_client import get_ai_client
        ai_client = get_ai_client(ai_provider)

        try:
            result = ai_client.generate_section_questions(
                section_title=section.title,
                section_description=section.description or '',
                count=count,
                analysis_context=analysis_data,
                existing_questions=existing_questions,
                project_type=project.project_type,
            )
        except Exception as e:
            return Response({'detail': f'AI 질문 생성 실패: {str(e)}'}, status=status.HTTP_502_BAD_GATEWAY)

        # Create questions
        from django.db import models as db_models
        max_order = questionnaire.questions.aggregate(max_order=db_models.Max('order'))['max_order'] or -1
        created_questions = []
        for q_data in result.get('questions', []):
            max_order += 1
            q = Question.objects.create(
                questionnaire=questionnaire,
                section=section,
                sub_category=q_data.get('sub_category', ''),
                text=q_data.get('text', ''),
                description=q_data.get('description', ''),
                question_type=q_data.get('question_type', Question.QuestionType.TEXTAREA),
                order=max_order,
                options=q_data.get('options', []),
                importance=q_data.get('importance', 'important'),
                purpose=q_data.get('purpose', ''),
            )
            created_questions.append(q)

        return Response({
            'detail': f'{len(created_questions)}개 질문이 생성되었습니다.',
            'questions': QuestionSerializer(created_questions, many=True).data,
        }, status=status.HTTP_201_CREATED)


class QuestionnaireTemplatesView(APIView):
    """GET - List other projects' questionnaires that can be used as templates."""

    permission_classes = [permissions.IsAuthenticated]

    def get(self, request, project_id):
        project = get_user_project(request, project_id)
        # Find questionnaires from other projects owned by this user that have questions
        questionnaires = Questionnaire.objects.exclude(
            project=project,
        ).select_related('project').prefetch_related('sections', 'questions')

        templates = []
        for q in questionnaires:
            section_count = q.sections.count()
            question_count = q.questions.count()
            if question_count == 0 and section_count == 0:
                continue
            templates.append({
                'project_id': q.project.id,
                'project_title': q.project.title,
                'client_name': q.project.client_name,
                'questionnaire_id': q.id,
                'title': q.title,
                'status': q.status,
                'section_count': section_count,
                'question_count': question_count,
            })

        return Response(templates)


class ImportQuestionnaireView(APIView):
    """POST - Copy sections and questions from another project's questionnaire."""

    permission_classes = [permissions.IsAuthenticated, IsProjectEditor]

    def post(self, request, project_id):
        project = get_user_project(request, project_id)
        source_project_id = request.data.get('source_project_id')
        if not source_project_id:
            return Response({'detail': 'source_project_id가 필요합니다.'}, status=status.HTTP_400_BAD_REQUEST)

        source_project = get_object_or_404(Project, pk=source_project_id)
        source_questionnaire = get_object_or_404(Questionnaire, project=source_project)

        # Get or create target questionnaire
        questionnaire, _ = Questionnaire.objects.get_or_create(
            project=project,
            defaults={'title': f'{project.title} 질문지', 'status': Questionnaire.Status.PENDING},
        )

        if questionnaire.status == Questionnaire.Status.CONFIRMED:
            return Response({'detail': '질문지가 확정되어 불러올 수 없습니다.'}, status=status.HTTP_400_BAD_REQUEST)

        # Copy sections and questions
        from django.db import models as db_models
        existing_section_order = questionnaire.sections.aggregate(max_order=db_models.Max('order'))['max_order'] or -1
        existing_q_order = questionnaire.questions.aggregate(max_order=db_models.Max('order'))['max_order'] or -1

        copied_sections = 0
        copied_questions = 0

        with transaction.atomic():
            for src_section in source_questionnaire.sections.order_by('order'):
                existing_section_order += 1
                new_section = QuestionSection.objects.create(
                    questionnaire=questionnaire,
                    title=src_section.title,
                    description=src_section.description,
                    importance=src_section.importance,
                    target_area=src_section.target_area,
                    order=existing_section_order,
                )
                copied_sections += 1

                for src_q in src_section.questions.order_by('order'):
                    existing_q_order += 1
                    Question.objects.create(
                        questionnaire=questionnaire,
                        section=new_section,
                        text=src_q.text,
                        description=src_q.description,
                        question_type=src_q.question_type,
                        sub_category=src_q.sub_category,
                        importance=src_q.importance,
                        purpose=src_q.purpose,
                        options=src_q.options,
                        order=existing_q_order,
                    )
                    copied_questions += 1

            # Copy unsectioned questions
            for src_q in source_questionnaire.questions.filter(section__isnull=True).order_by('order'):
                existing_q_order += 1
                Question.objects.create(
                    questionnaire=questionnaire,
                    text=src_q.text,
                    description=src_q.description,
                    question_type=src_q.question_type,
                    sub_category=src_q.sub_category,
                    importance=src_q.importance,
                    purpose=src_q.purpose,
                    options=src_q.options,
                    order=existing_q_order,
                )
                copied_questions += 1

        from apps.projects.models import log_activity
        log_activity(project, request.user, 'questionnaire_imported', {'source_project': source_project.title, 'sections': copied_sections, 'questions': copied_questions})

        return Response({
            'detail': f'{copied_sections}개 섹션, {copied_questions}개 질문을 불러왔습니다.',
            'questionnaire': QuestionnaireSerializer(questionnaire).data,
        }, status=status.HTTP_201_CREATED)


class PositionCategoryViewSet(viewsets.ModelViewSet):
    """CRUD for position categories within a questionnaire."""

    permission_classes = [permissions.IsAuthenticated, IsProjectEditorOrReadOnly]
    serializer_class = PositionCategorySerializer

    def get_questionnaire(self):
        project = get_user_project(self.request, self.kwargs['project_id'])
        return get_object_or_404(Questionnaire, project=project)

    def get_queryset(self):
        questionnaire = self.get_questionnaire()
        return PositionCategory.objects.filter(questionnaire=questionnaire)

    def perform_create(self, serializer):
        questionnaire = self.get_questionnaire()
        serializer.save(questionnaire=questionnaire)
