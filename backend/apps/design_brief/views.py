from django.shortcuts import get_object_or_404
from rest_framework import permissions, status
from rest_framework.response import Response
from rest_framework.views import APIView

from apps.projects.models import Project
from apps.aggregation.models import Aggregation
from services.ai_client import validate_ai_provider
from .models import DesignBrief, StitchGeneration
from .serializers import (
    DesignBriefSerializer,
    DesignBriefUpdateSerializer,
    DesignBriefExportSerializer,
    StitchGenerationSerializer,
)


def get_user_project(request, project_id):
    """Return a project owned by the requesting user or 404."""
    return get_object_or_404(Project, pk=project_id, owner=request.user)


def get_user_brief(request, project_id):
    """Return the design brief for a project owned by the user or 404."""
    project = get_user_project(request, project_id)
    return get_object_or_404(DesignBrief, project=project)


class CompileDesignBriefView(APIView):
    """POST - Compile brief from latest aggregation."""

    permission_classes = [permissions.IsAuthenticated]

    def post(self, request, project_id):
        project = get_user_project(request, project_id)

        aggregation = project.aggregations.first()
        if not aggregation:
            return Response(
                {'detail': 'No aggregation found. Run aggregation first.'},
                status=status.HTTP_400_BAD_REQUEST,
            )

        brief, created = DesignBrief.objects.update_or_create(
            project=project,
            defaults={
                'aggregation': aggregation,
                'title': f'{project.title} Design Brief',
                'summary': aggregation.summary,
                'design_direction': aggregation.company_direction,
                'selected_keywords': [
                    {'id': kw.id, 'text': kw.text, 'category': kw.category}
                    for kw in aggregation.keywords.all()
                ],
                'selected_sentences': [
                    {'id': s.id, 'text': s.text, 'category': s.category}
                    for s in aggregation.sentences.all()
                ],
            },
        )

        resp_status = status.HTTP_201_CREATED if created else status.HTTP_200_OK
        return Response(DesignBriefSerializer(brief).data, status=resp_status)


class DesignBriefDetailView(APIView):
    """GET/PATCH - Get or update brief."""

    permission_classes = [permissions.IsAuthenticated]

    def get(self, request, project_id):
        brief = get_user_brief(request, project_id)
        return Response(DesignBriefSerializer(brief).data)

    def patch(self, request, project_id):
        brief = get_user_brief(request, project_id)
        serializer = DesignBriefUpdateSerializer(
            brief, data=request.data, partial=True,
        )
        serializer.is_valid(raise_exception=True)
        serializer.save()
        return Response(DesignBriefSerializer(brief).data)


class TriggerStitchView(APIView):
    """POST - Trigger Stitch generation."""

    permission_classes = [permissions.IsAuthenticated]

    def post(self, request, project_id):
        brief = get_user_brief(request, project_id)

        if not brief.design_md:
            return Response(
                {'detail': 'DESIGN.md를 먼저 생성해주세요.'},
                status=status.HTTP_400_BAD_REQUEST,
            )

        # Block if there's already a processing generation
        if brief.stitch_generations.filter(
            status__in=[StitchGeneration.Status.PENDING, StitchGeneration.Status.PROCESSING]
        ).exists():
            return Response(
                {'detail': 'A design generation is already in progress.'},
                status=status.HTTP_409_CONFLICT,
            )

        latest_version = (
            brief.stitch_generations
            .order_by('-version')
            .values_list('version', flat=True)
            .first() or 0
        )

        prompt_text = request.data.get('prompt_text', '') or brief.summary or brief.title

        generation = StitchGeneration.objects.create(
            design_brief=brief,
            prompt_text=prompt_text,
            design_md_snapshot=brief.design_md,
            version=latest_version + 1,
            status=StitchGeneration.Status.PENDING,
        )

        from .tasks import run_stitch_generation
        run_stitch_generation.delay(generation.id)

        return Response(
            StitchGenerationSerializer(generation).data,
            status=status.HTTP_202_ACCEPTED,
        )


class StitchListView(APIView):
    """GET - List all generations for a design brief."""

    permission_classes = [permissions.IsAuthenticated]

    def get(self, request, project_id):
        brief = get_user_brief(request, project_id)
        generations = brief.stitch_generations.all()
        return Response(StitchGenerationSerializer(generations, many=True).data)


class StitchDetailView(APIView):
    """GET - Single generation detail."""

    permission_classes = [permissions.IsAuthenticated]

    def get(self, request, project_id, generation_id):
        brief = get_user_brief(request, project_id)
        generation = get_object_or_404(
            StitchGeneration, pk=generation_id, design_brief=brief,
        )
        return Response(StitchGenerationSerializer(generation).data)


class StitchRegenerateView(APIView):
    """POST - Regenerate with modified prompt."""

    permission_classes = [permissions.IsAuthenticated]

    def post(self, request, project_id, generation_id):
        brief = get_user_brief(request, project_id)
        original = get_object_or_404(
            StitchGeneration, pk=generation_id, design_brief=brief,
        )

        latest_version = (
            brief.stitch_generations
            .order_by('-version')
            .values_list('version', flat=True)
            .first() or 0
        )

        prompt_text = request.data.get('prompt_text', original.prompt_text)

        generation = StitchGeneration.objects.create(
            design_brief=brief,
            prompt_text=prompt_text,
            design_md_snapshot=brief.design_md or original.design_md_snapshot,
            version=latest_version + 1,
            status=StitchGeneration.Status.PENDING,
        )

        from .tasks import run_stitch_generation
        run_stitch_generation.delay(generation.id)

        return Response(
            StitchGenerationSerializer(generation).data,
            status=status.HTTP_202_ACCEPTED,
        )


class StitchFetchScreensView(APIView):
    """POST - Phase 2: Fetch screens from Stitch for an existing generation."""

    permission_classes = [permissions.IsAuthenticated]

    def post(self, request, project_id, generation_id):
        brief = get_user_brief(request, project_id)
        generation = get_object_or_404(
            StitchGeneration, pk=generation_id, design_brief=brief,
        )

        if not generation.stitch_project_id:
            return Response(
                {'detail': 'No Stitch project ID found.'},
                status=status.HTTP_400_BAD_REQUEST,
            )

        from services.stitch_client import StitchClient
        stitch = StitchClient()

        try:
            result = stitch.fetch_screens(generation.stitch_project_id)
        except Exception as e:
            return Response(
                {'detail': f'Failed to fetch screens: {e}'},
                status=status.HTTP_502_BAD_GATEWAY,
            )

        # Update generation with fetched data
        if result.get('html_content'):
            generation.generated_html_content = result['html_content']
        if result.get('html_url'):
            generation.generated_html_url = result['html_url']
        if result.get('screenshot_url'):
            generation.generated_screenshot_url = result['screenshot_url']
        if result.get('project_url'):
            generation.stitch_project_url = result['project_url']

        generation.status = StitchGeneration.Status.COMPLETED
        generation.error_message = ''
        generation.save()

        return Response(StitchGenerationSerializer(generation).data)


class ExportBriefView(APIView):
    """GET - Export brief as JSON."""

    permission_classes = [permissions.IsAuthenticated]

    def get(self, request, project_id):
        brief = get_user_brief(request, project_id)
        return Response(DesignBriefExportSerializer(brief).data)


class GenerateDesignMdView(APIView):
    """POST - Generate DESIGN.md content from brief using AI."""

    permission_classes = [permissions.IsAuthenticated]

    def post(self, request, project_id):
        from services.ai_client import get_ai_client
        brief = get_user_brief(request, project_id)
        ai_provider = validate_ai_provider(request.data.get('ai_provider'))

        brief_data = {
            'title': brief.title,
            'summary': brief.summary,
            'design_direction': brief.design_direction,
            'target_audience': brief.target_audience,
            'key_requirements': brief.key_requirements,
            'selected_keywords': brief.selected_keywords,
            'selected_sentences': brief.selected_sentences,
            'tone_and_mood': brief.tone_and_mood,
            'color_preferences': brief.color_preferences,
            'additional_notes': brief.additional_notes,
        }

        ai_client = get_ai_client(ai_provider)
        design_md = ai_client.generate_design_md(brief_data)

        brief.design_md = design_md
        brief.save(update_fields=['design_md', 'updated_at'])

        return Response({
            'design_md': design_md,
            'ai_provider': ai_provider,
        })


class DownloadDesignMdView(APIView):
    """GET - Download DESIGN.md as a file."""

    permission_classes = [permissions.IsAuthenticated]

    def get(self, request, project_id):
        from django.http import HttpResponse
        brief = get_user_brief(request, project_id)

        if not brief.design_md:
            return Response(
                {'detail': 'Design MD has not been generated yet.'},
                status=status.HTTP_404_NOT_FOUND,
            )

        response = HttpResponse(brief.design_md, content_type='text/markdown; charset=utf-8')
        response['Content-Disposition'] = f'attachment; filename="DESIGN.md"'
        return response
