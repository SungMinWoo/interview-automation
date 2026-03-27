from django.shortcuts import get_object_or_404
from django.utils import timezone
from rest_framework import permissions, status
from rest_framework.response import Response
from rest_framework.views import APIView

from apps.projects.models import Project
from .models import ProjectAnalysis
from .serializers import (
    ProjectAnalysisSerializer,
    ProjectAnalysisStatusSerializer,
    ProjectAnalysisUpdateSerializer,
)


def get_user_project(request, project_id):
    """Return a project owned by the requesting user or 404."""
    return get_object_or_404(Project, pk=project_id, owner=request.user)


class TriggerAnalysisView(APIView):
    """POST - Start async analysis for a project."""

    permission_classes = [permissions.IsAuthenticated]

    def post(self, request, project_id):
        project = get_user_project(request, project_id)

        analysis, created = ProjectAnalysis.objects.get_or_create(
            project=project,
            defaults={'status': ProjectAnalysis.Status.PENDING},
        )

        if not created and analysis.status in (
            ProjectAnalysis.Status.PROCESSING,
            ProjectAnalysis.Status.CONFIRMED,
        ):
            return Response(
                {'detail': f'Analysis is already {analysis.status}.'},
                status=status.HTTP_409_CONFLICT,
            )

        analysis.status = ProjectAnalysis.Status.PROCESSING
        analysis.error_message = ''
        analysis.save(update_fields=['status', 'error_message', 'updated_at'])

        # Trigger Celery task
        from .tasks import run_project_analysis
        run_project_analysis.delay(project.id)

        return Response(
            ProjectAnalysisStatusSerializer(analysis).data,
            status=status.HTTP_202_ACCEPTED,
        )


class AnalysisDetailUpdateView(APIView):
    """GET - Return analysis result. PATCH - User edits the analysis."""

    permission_classes = [permissions.IsAuthenticated]

    def get(self, request, project_id):
        project = get_user_project(request, project_id)
        analysis = get_object_or_404(ProjectAnalysis, project=project)
        return Response(ProjectAnalysisSerializer(analysis).data)

    def patch(self, request, project_id):
        project = get_user_project(request, project_id)
        analysis = get_object_or_404(ProjectAnalysis, project=project)

        serializer = ProjectAnalysisUpdateSerializer(
            analysis, data=request.data, partial=True,
        )
        serializer.is_valid(raise_exception=True)
        serializer.save()

        return Response(ProjectAnalysisSerializer(analysis).data)


class AnalysisConfirmView(APIView):
    """POST - Confirm the analysis (sets status=confirmed, confirmed_at)."""

    permission_classes = [permissions.IsAuthenticated]

    def post(self, request, project_id):
        project = get_user_project(request, project_id)
        analysis = get_object_or_404(ProjectAnalysis, project=project)

        if analysis.status == ProjectAnalysis.Status.CONFIRMED:
            return Response(
                {'detail': 'Analysis is already confirmed.'},
                status=status.HTTP_409_CONFLICT,
            )

        if analysis.status != ProjectAnalysis.Status.COMPLETED:
            return Response(
                {'detail': 'Analysis must be completed before confirmation.'},
                status=status.HTTP_400_BAD_REQUEST,
            )

        analysis.status = ProjectAnalysis.Status.CONFIRMED
        analysis.confirmed_at = timezone.now()
        analysis.save(update_fields=['status', 'confirmed_at', 'updated_at'])

        # Also update the project status
        project.status = Project.Status.ANALYSIS_CONFIRMED
        project.save(update_fields=['status', 'updated_at'])

        return Response(ProjectAnalysisSerializer(analysis).data)


class AnalysisStatusView(APIView):
    """GET - Return current status for polling."""

    permission_classes = [permissions.IsAuthenticated]

    def get(self, request, project_id):
        project = get_user_project(request, project_id)
        analysis = get_object_or_404(ProjectAnalysis, project=project)
        return Response(ProjectAnalysisStatusSerializer(analysis).data)
