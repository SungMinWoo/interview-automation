from django.shortcuts import get_object_or_404
from rest_framework import permissions, status
from rest_framework.response import Response
from rest_framework.views import APIView

from apps.projects.models import Project
from apps.aggregation.models import Aggregation
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

        latest_version = (
            brief.stitch_generations
            .order_by('-version')
            .values_list('version', flat=True)
            .first() or 0
        )

        prompt_text = request.data.get('prompt_text', '')
        reference_images = request.data.get('reference_images', [])

        generation = StitchGeneration.objects.create(
            design_brief=brief,
            prompt_text=prompt_text,
            reference_images=reference_images,
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
        reference_images = request.data.get('reference_images', original.reference_images)

        generation = StitchGeneration.objects.create(
            design_brief=brief,
            prompt_text=prompt_text,
            reference_images=reference_images,
            version=latest_version + 1,
            status=StitchGeneration.Status.PENDING,
        )

        from .tasks import run_stitch_generation
        run_stitch_generation.delay(generation.id)

        return Response(
            StitchGenerationSerializer(generation).data,
            status=status.HTTP_202_ACCEPTED,
        )


class ExportBriefView(APIView):
    """GET - Export brief as JSON."""

    permission_classes = [permissions.IsAuthenticated]

    def get(self, request, project_id):
        brief = get_user_brief(request, project_id)
        return Response(DesignBriefExportSerializer(brief).data)
