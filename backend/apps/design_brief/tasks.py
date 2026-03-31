"""Celery tasks for the design_brief app."""

import logging
from celery import shared_task

logger = logging.getLogger(__name__)


@shared_task(bind=True, max_retries=0)
def run_stitch_generation(self, generation_id: int) -> None:
    """Create Stitch project with design_md and generate screen.

    design_md is passed directly to Stitch as the design system.
    prompt_text is the text prompt for screen generation.
    """
    from .models import StitchGeneration
    from services.stitch_client import StitchClient

    try:
        generation = StitchGeneration.objects.get(pk=generation_id)
        generation.status = StitchGeneration.Status.PROCESSING
        generation.save(update_fields=['status'])

        brief = generation.design_brief

        # Build prompt: DESIGN.md content + brief summary
        design_md = generation.design_md_snapshot or ''
        summary = generation.prompt_text or brief.summary or brief.title or ''

        # Combine: DESIGN.md as the main content, summary as context
        if design_md:
            prompt_text = f"{design_md}\n\n---\n\nGenerate a website screen based on the design system above.\nContext: {summary}"
        else:
            prompt_text = summary

        # Save the final prompt
        generation.prompt_text = prompt_text
        generation.save(update_fields=['prompt_text'])

        # Call Stitch Bridge
        stitch = StitchClient()
        result = stitch.generate_design(
            prompt=prompt_text,
            design_md=design_md,
            colors=brief.color_preferences if isinstance(brief.color_preferences, dict) else None,
        )

        # Save results
        generation.stitch_project_id = result.get('project_id', '')
        generation.stitch_project_url = result.get('project_url', '')
        generation.generated_html_url = result.get('html_url', '') or ''
        generation.generated_screenshot_url = result.get('screenshot_url', '') or ''
        generation.generated_html_content = result.get('html_content', '') or ''

        stitch_status = result.get('status', 'failed')
        if stitch_status in ('completed', 'created'):
            generation.status = StitchGeneration.Status.COMPLETED
            if result.get('error'):
                generation.error_message = f"프로젝트 생성됨. 스크린: {result['error']}"
        else:
            generation.status = StitchGeneration.Status.FAILED
            generation.error_message = result.get('error', 'Unknown error')

        generation.save()

        if generation.status == StitchGeneration.Status.COMPLETED:
            from apps.projects.models import Project
            project = brief.project
            project.status = Project.Status.BRIEF_READY
            project.save(update_fields=['status', 'updated_at'])

        logger.info(f"Stitch generation {generation_id}: status={generation.status}, project={generation.stitch_project_id}")

    except StitchGeneration.DoesNotExist:
        logger.error(f"StitchGeneration not found: {generation_id}")
    except Exception as exc:
        logger.error(f"Stitch generation failed: {exc}")
        try:
            generation = StitchGeneration.objects.get(pk=generation_id)
            generation.status = StitchGeneration.Status.FAILED
            generation.error_message = str(exc)
            generation.save(update_fields=['status', 'error_message'])
        except StitchGeneration.DoesNotExist:
            pass
