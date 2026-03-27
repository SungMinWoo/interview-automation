from django.db import transaction
from django.shortcuts import get_object_or_404
from rest_framework import permissions, status, viewsets
from rest_framework.response import Response
from rest_framework.views import APIView

from apps.projects.models import Project
from .models import Questionnaire, Question, PositionCategory
from .serializers import (
    QuestionnaireSerializer,
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

        questionnaire, created = Questionnaire.objects.get_or_create(
            project=project,
            defaults={
                'title': f'{project.title} 질문지',
            },
        )

        # Trigger async generation
        from .tasks import generate_questionnaire
        generate_questionnaire.delay(questionnaire.id)

        return Response(
            QuestionnaireSerializer(questionnaire).data,
            status=status.HTTP_202_ACCEPTED,
        )


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

    def get_queryset(self):
        questionnaire = self.get_questionnaire()
        return Question.objects.filter(questionnaire=questionnaire)

    def perform_create(self, serializer):
        questionnaire = self.get_questionnaire()
        serializer.save(questionnaire=questionnaire)


class QuestionReorderView(APIView):
    """POST - Bulk reorder questions. Accepts list of {id, order}."""

    permission_classes = [permissions.IsAuthenticated]

    def post(self, request, project_id):
        questionnaire = get_user_questionnaire(request, project_id)

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
