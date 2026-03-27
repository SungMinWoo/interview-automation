"""Celery tasks for the aggregation app."""

import logging
from celery import shared_task

logger = logging.getLogger(__name__)


@shared_task(bind=True, max_retries=3, default_retry_delay=30)
def run_aggregation(self, aggregation_id: int) -> None:
    """Aggregate all survey responses using Gemini AI."""
    from apps.projects.models import Project
    from apps.responses.models import SurveyResponse, Answer
    from .models import Aggregation, ExtractedKeyword, ExtractedSentence
    from services.gemini_client import GeminiClient

    try:
        aggregation = Aggregation.objects.get(pk=aggregation_id)
        project = aggregation.project

        aggregation.status = Aggregation.Status.PROCESSING
        aggregation.save(update_fields=['status'])

        project.status = Project.Status.AGGREGATING
        project.save(update_fields=['status', 'updated_at'])

        # Gather all responses with answers
        responses = SurveyResponse.objects.filter(
            project=project,
            completed_at__isnull=False,
        ).select_related('employee').prefetch_related('answers__question')

        questions_with_answers = {}
        for response in responses:
            for answer in response.answers.all():
                q_text = answer.question.text
                if q_text not in questions_with_answers:
                    questions_with_answers[q_text] = []
                questions_with_answers[q_text].append({
                    'employee_name': response.employee.name,
                    'position': response.employee.position,
                    'text_value': answer.text_value,
                    'choice_values': answer.choice_values,
                    'rating_value': answer.rating_value,
                })

        formatted_data = [
            {'question_text': q, 'answers': a}
            for q, a in questions_with_answers.items()
        ]

        # Get analysis context
        analysis_context = {}
        if hasattr(project, 'analysis') and project.analysis:
            a = project.analysis
            analysis_context = {
                'requirements_summary': a.requirements_summary,
                'combined_insights': a.combined_insights,
            }

        # Run AI aggregation
        gemini = GeminiClient()
        result = gemini.aggregate_responses(
            questions_with_answers=formatted_data,
            analysis_context=analysis_context,
        )

        # Save aggregation results
        aggregation.summary = result.get('summary', '')
        aggregation.company_direction = result.get('company_direction', '')
        aggregation.desired_changes = result.get('desired_changes', [])
        aggregation.company_values = result.get('company_values', [])
        aggregation.raw_ai_response = result
        aggregation.status = Aggregation.Status.COMPLETED
        aggregation.save()

        # Create keywords
        for i, kw_data in enumerate(result.get('keywords', [])):
            ExtractedKeyword.objects.create(
                aggregation=aggregation,
                text=kw_data.get('text', ''),
                category=kw_data.get('category', ''),
                weight=kw_data.get('weight', 1.0),
                order=i,
            )

        # Create sentences
        for i, sent_data in enumerate(result.get('sentences', [])):
            ExtractedSentence.objects.create(
                aggregation=aggregation,
                text=sent_data.get('text', ''),
                category=sent_data.get('category', ''),
                order=i,
            )

        project.status = Project.Status.AGGREGATION_READY
        project.save(update_fields=['status', 'updated_at'])

        logger.info(f"Aggregation completed for project {project.id}")

    except Aggregation.DoesNotExist:
        logger.error(f"Aggregation not found: {aggregation_id}")
    except Exception as exc:
        logger.error(f"Aggregation failed: {exc}")
        try:
            aggregation = Aggregation.objects.get(pk=aggregation_id)
            aggregation.status = Aggregation.Status.FAILED
            aggregation.error_message = str(exc)
            aggregation.save(update_fields=['status', 'error_message'])
        except Aggregation.DoesNotExist:
            pass
        raise self.retry(exc=exc)
