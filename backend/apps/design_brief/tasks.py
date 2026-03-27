"""Celery tasks for the design_brief app."""

import logging
from celery import shared_task

logger = logging.getLogger(__name__)


@shared_task(bind=True, max_retries=3, default_retry_delay=30)
def run_stitch_generation(self, generation_id: int) -> None:
    """Generate a design using the Stitch Bridge service."""
    from .models import StitchGeneration
    from services.stitch_client import StitchClient
    from services.gemini_client import GeminiClient

    try:
        generation = StitchGeneration.objects.get(pk=generation_id)
        generation.status = StitchGeneration.Status.PROCESSING
        generation.save(update_fields=['status'])

        brief = generation.design_brief

        # If no custom prompt, generate one from the brief
        prompt_text = generation.prompt_text
        if not prompt_text:
            gemini = GeminiClient()
            brief_data = {
                'title': brief.title,
                'summary': brief.summary,
                'design_direction': brief.design_direction,
                'target_audience': brief.target_audience,
                'key_requirements': brief.key_requirements,
                'selected_keywords': brief.selected_keywords,
                'tone_and_mood': brief.tone_and_mood,
                'color_preferences': brief.color_preferences,
            }
            prompt_text = gemini.build_stitch_prompt(brief_data)
            generation.prompt_text = prompt_text
            generation.save(update_fields=['prompt_text'])

        # Call Stitch Bridge
        stitch = StitchClient()
        result = stitch.generate_design(
            prompt=prompt_text,
            reference_image_urls=generation.reference_images,
        )

        generation.stitch_project_id = result.get('project_id', '')
        generation.generated_html_url = result.get('html_url', '')
        generation.generated_screenshot_url = result.get('screenshot_url', '')
        generation.generated_html_content = result.get('html_content', '')
        generation.status = StitchGeneration.Status.COMPLETED
        generation.save()

        # Update project status
        project = brief.project
        from apps.projects.models import Project
        project.status = Project.Status.BRIEF_READY
        project.save(update_fields=['status', 'updated_at'])

        logger.info(f"Stitch generation completed: {generation_id}")

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
        raise self.retry(exc=exc)
