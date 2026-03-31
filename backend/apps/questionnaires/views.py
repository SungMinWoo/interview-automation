from django.db import transaction
from django.shortcuts import get_object_or_404
from rest_framework import permissions, status, viewsets
from rest_framework.response import Response
from rest_framework.views import APIView

from apps.projects.models import Project
from services.ai_client import validate_ai_provider
from .models import Questionnaire, Question, PositionCategory
from .serializers import (
    QuestionnaireSerializer,
    QuestionnaireStatusSerializer,
    QuestionSerializer,
    PositionCategorySerializer,
    QuestionReorderSerializer,
)


def get_user_project(request, project_id):
    """Return a project owned by the requesting user or 404."""
    return get_object_or_404(Project, pk=project_id, owner=request.user)


def get_user_questionnaire(request, project_id):
    """Return the questionnaire for a project owned by the user or 404."""
    project = get_user_project(request, project_id)
    return get_object_or_404(Questionnaire, project=project)


class GenerateQuestionnaireView(APIView):
    """POST - Trigger AI generation of a questionnaire."""

    permission_classes = [permissions.IsAuthenticated]

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
        from .tasks import generate_questionnaire
        generate_questionnaire.delay(questionnaire.id, ai_provider=ai_provider)

        return Response(
            QuestionnaireSerializer(questionnaire).data,
            status=status.HTTP_202_ACCEPTED,
        )


class QuestionnaireConfirmView(APIView):
    """POST - Confirm the questionnaire (sets status=confirmed)."""

    permission_classes = [permissions.IsAuthenticated]

    def post(self, request, project_id):
        questionnaire = get_user_questionnaire(request, project_id)

        if questionnaire.questions.count() == 0:
            return Response(
                {'detail': 'Cannot confirm an empty questionnaire.'},
                status=status.HTTP_400_BAD_REQUEST,
            )

        questionnaire.status = Questionnaire.Status.CONFIRMED
        questionnaire.save(update_fields=['status', 'updated_at'])

        return Response(QuestionnaireSerializer(questionnaire).data)


class QuestionnaireStatusView(APIView):
    """GET - Return current questionnaire generation status for polling."""

    permission_classes = [permissions.IsAuthenticated]

    def get(self, request, project_id):
        questionnaire = get_user_questionnaire(request, project_id)
        return Response(QuestionnaireStatusSerializer(questionnaire).data)


class QuestionnaireDetailView(APIView):
    """GET/PATCH - Retrieve or update a questionnaire."""

    permission_classes = [permissions.IsAuthenticated]

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

    permission_classes = [permissions.IsAuthenticated]
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

    permission_classes = [permissions.IsAuthenticated]

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


class PositionCategoryViewSet(viewsets.ModelViewSet):
    """CRUD for position categories within a questionnaire."""

    permission_classes = [permissions.IsAuthenticated]
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
