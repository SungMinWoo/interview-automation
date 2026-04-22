from django.shortcuts import get_object_or_404
from rest_framework import permissions, status, viewsets
from rest_framework.response import Response
from rest_framework.views import APIView

from apps.projects.models import Project
from services.ai_client import validate_ai_provider
from .models import Aggregation, ExtractedKeyword, ExtractedSentence
from .serializers import (
    AggregationSerializer,
    AggregationStatusSerializer,
    ExtractedKeywordSerializer,
    ExtractedSentenceSerializer,
)


def get_user_project(request, project_id):
    """Return a project owned by the requesting user or 404."""
    return get_object_or_404(Project, pk=project_id)


def get_latest_aggregation(project):
    """Return the latest aggregation for a project or 404."""
    return get_object_or_404(
        Aggregation, project=project, version=project.aggregations.count(),
    )


class TriggerAggregationView(APIView):
    """POST - Start AI aggregation, creates new Aggregation with incremented version."""

    permission_classes = [permissions.IsAuthenticated]

    def post(self, request, project_id):
        project = get_user_project(request, project_id)
        ai_provider = validate_ai_provider(request.data.get('ai_provider'))

        latest_version = (
            project.aggregations.order_by('-version').values_list('version', flat=True).first() or 0
        )

        aggregation = Aggregation.objects.create(
            project=project,
            version=latest_version + 1,
            status=Aggregation.Status.PENDING,
            ai_provider=ai_provider,
        )

        from .tasks import run_aggregation
        run_aggregation.delay(aggregation.id, ai_provider=ai_provider)

        from apps.projects.models import log_activity
        log_activity(project, request.user, 'aggregation_triggered', {'ai_provider': ai_provider})

        return Response(
            AggregationSerializer(aggregation).data,
            status=status.HTTP_202_ACCEPTED,
        )


class AggregationDetailView(APIView):
    """GET - Returns latest aggregation with nested keywords and sentences."""

    permission_classes = [permissions.IsAuthenticated]

    def get(self, request, project_id):
        project = get_user_project(request, project_id)
        aggregation = project.aggregations.first()
        if not aggregation:
            return Response(
                {'detail': 'No aggregation found.'},
                status=status.HTTP_404_NOT_FOUND,
            )
        return Response(AggregationSerializer(aggregation).data)


class AggregationStatusView(APIView):
    """GET - Polling status of latest aggregation."""

    permission_classes = [permissions.IsAuthenticated]

    def get(self, request, project_id):
        project = get_user_project(request, project_id)
        aggregation = project.aggregations.first()
        if not aggregation:
            return Response(
                {'detail': 'No aggregation found.'},
                status=status.HTTP_404_NOT_FOUND,
            )
        return Response(AggregationStatusSerializer(aggregation).data)


class RegenerateAggregationView(APIView):
    """POST - Trigger regeneration (new version)."""

    permission_classes = [permissions.IsAuthenticated]

    def post(self, request, project_id):
        project = get_user_project(request, project_id)
        ai_provider = validate_ai_provider(request.data.get('ai_provider'))

        latest_version = (
            project.aggregations.order_by('-version').values_list('version', flat=True).first() or 0
        )

        aggregation = Aggregation.objects.create(
            project=project,
            version=latest_version + 1,
            status=Aggregation.Status.PENDING,
            ai_provider=ai_provider,
        )

        from .tasks import run_aggregation
        run_aggregation.delay(aggregation.id, ai_provider=ai_provider)

        return Response(
            AggregationSerializer(aggregation).data,
            status=status.HTTP_202_ACCEPTED,
        )


class KeywordViewSet(viewsets.ModelViewSet):
    """CRUD for keywords on latest aggregation."""

    permission_classes = [permissions.IsAuthenticated]
    serializer_class = ExtractedKeywordSerializer

    def get_aggregation(self):
        project = get_user_project(self.request, self.kwargs['project_id'])
        aggregation = project.aggregations.first()
        if not aggregation:
            return None
        return aggregation

    def get_queryset(self):
        aggregation = self.get_aggregation()
        if not aggregation:
            return ExtractedKeyword.objects.none()
        return ExtractedKeyword.objects.filter(aggregation=aggregation)

    def perform_create(self, serializer):
        aggregation = self.get_aggregation()
        if not aggregation:
            from rest_framework.exceptions import NotFound
            raise NotFound('No aggregation found.')
        serializer.save(aggregation=aggregation, is_user_added=True)


class SentenceViewSet(viewsets.ModelViewSet):
    """CRUD for sentences on latest aggregation."""

    permission_classes = [permissions.IsAuthenticated]
    serializer_class = ExtractedSentenceSerializer

    def get_aggregation(self):
        project = get_user_project(self.request, self.kwargs['project_id'])
        aggregation = project.aggregations.first()
        if not aggregation:
            return None
        return aggregation

    def get_queryset(self):
        aggregation = self.get_aggregation()
        if not aggregation:
            return ExtractedSentence.objects.none()
        return ExtractedSentence.objects.filter(aggregation=aggregation)

    def perform_create(self, serializer):
        aggregation = self.get_aggregation()
        if not aggregation:
            from rest_framework.exceptions import NotFound
            raise NotFound('No aggregation found.')
        serializer.save(aggregation=aggregation, is_user_added=True)
