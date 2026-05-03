from django.shortcuts import get_object_or_404
from django.utils import timezone
from rest_framework import permissions, status
from rest_framework.response import Response
from rest_framework.views import APIView

from apps.projects.models import Project
from apps.projects.access import get_accessible_project as get_user_project
from .models import ProjectAnalysis
from .serializers import (
    ProjectAnalysisSerializer,
    ProjectAnalysisStatusSerializer,
    ProjectAnalysisUpdateSerializer,
)
from services.ai_client import validate_ai_provider


class TriggerAnalysisView(APIView):
    """POST - Start async analysis for a project."""

    permission_classes = [permissions.IsAuthenticated]

    def post(self, request, project_id):
        project = get_user_project(request, project_id)
        ai_provider = validate_ai_provider(request.data.get('ai_provider'))

        analysis, created = ProjectAnalysis.objects.get_or_create(
            project=project,
            defaults={'status': ProjectAnalysis.Status.PENDING, 'ai_provider': ai_provider},
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
        analysis.ai_provider = ai_provider
        analysis.error_message = ''
        analysis.save(update_fields=['status', 'ai_provider', 'error_message', 'updated_at'])

        # Trigger Celery task
        from .tasks import run_project_analysis
        run_project_analysis.delay(project.id, ai_provider=ai_provider)

        from apps.projects.models import log_activity
        log_activity(project, request.user, 'analysis_triggered', {'ai_provider': ai_provider})

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

        from apps.projects.models import log_activity
        log_activity(project, request.user, 'analysis_confirmed')

        from apps.notifications.tasks import create_project_notifications
        create_project_notifications.delay(
            project_id=project.id,
            event_type='analysis_confirmed',
            title=f'{project.title} — 분석이 확인되었습니다',
            exclude_user_id=request.user.id,
            actor_id=request.user.id,
        )

        return Response(ProjectAnalysisSerializer(analysis).data)


class RegenerateAnalysisSectionView(APIView):
    """POST - Regenerate a specific section of the analysis with AI."""

    permission_classes = [permissions.IsAuthenticated]

    VALID_SECTIONS = {'requirements_summary', 'existing_site_analysis', 'reference_sites_analysis', 'combined_insights'}

    def post(self, request, project_id):
        project = get_user_project(request, project_id)
        analysis = get_object_or_404(ProjectAnalysis, project=project)

        if analysis.status == ProjectAnalysis.Status.CONFIRMED:
            return Response(
                {'detail': '분석이 확인되어 수정할 수 없습니다.'},
                status=status.HTTP_400_BAD_REQUEST,
            )

        section = request.data.get('section')
        if section not in self.VALID_SECTIONS:
            return Response(
                {'detail': f'유효하지 않은 섹션: {section}. 가능한 값: {", ".join(self.VALID_SECTIONS)}'},
                status=status.HTTP_400_BAD_REQUEST,
            )

        ai_provider = validate_ai_provider(request.data.get('ai_provider'))

        # Build context
        current_analysis = {
            'requirements_summary': analysis.requirements_summary,
            'existing_site_analysis': analysis.existing_site_analysis,
            'reference_sites_analysis': analysis.reference_sites_analysis,
            'combined_insights': analysis.combined_insights,
        }
        context = {
            'requirements_text': project.requirements_text,
            'existing_site_url': project.existing_site_url or '',
        }

        # Include file contents
        from apps.projects.models import ProjectFile
        files = ProjectFile.objects.filter(project=project)
        if files.exists():
            context['file_contents'] = [
                {'file_name': f.original_name, 'summary': f.ai_summary or '', 'content': (f.extracted_text or '')[:3000]}
                for f in files if f.extracted_text or f.ai_summary
            ]

        from services.ai_client import get_ai_client
        ai_client = get_ai_client(ai_provider)

        try:
            result = ai_client.regenerate_analysis_section(
                section=section,
                current_analysis=current_analysis,
                context=context,
                project_type=project.project_type,
            )
        except Exception as e:
            return Response({'detail': f'AI 재생성 실패: {str(e)}'}, status=status.HTTP_502_BAD_GATEWAY)

        # Update the specific section
        new_value = result.get(section)
        if new_value is not None:
            setattr(analysis, section, new_value)
            analysis.save(update_fields=[section, 'updated_at'])

        from apps.projects.models import log_activity
        log_activity(project, request.user, 'analysis_section_regenerated', {'section': section, 'ai_provider': ai_provider})

        return Response(ProjectAnalysisSerializer(analysis).data)


class AnalysisStatusView(APIView):
    """GET - Return current status for polling."""

    permission_classes = [permissions.IsAuthenticated]

    def get(self, request, project_id):
        project = get_user_project(request, project_id)
        analysis = get_object_or_404(ProjectAnalysis, project=project)
        return Response(ProjectAnalysisStatusSerializer(analysis).data)
