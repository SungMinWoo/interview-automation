"""Celery tasks for the questionnaires app."""

import logging
from celery import shared_task

logger = logging.getLogger(__name__)


@shared_task(bind=True, max_retries=3, default_retry_delay=30)
def generate_questionnaire(self, questionnaire_id: int) -> None:
    """Generate interview questions using Gemini AI."""
    from apps.projects.models import Project
    from .models import Questionnaire, Question, PositionCategory
    from services.gemini_client import GeminiClient

    try:
        questionnaire = Questionnaire.objects.get(pk=questionnaire_id)
        project = questionnaire.project

        # Get confirmed analysis
        analysis_data = {}
        if hasattr(project, 'analysis') and project.analysis:
            a = project.analysis
            analysis_data = {
                'requirements_summary': a.requirements_summary,
                'existing_site_analysis': a.existing_site_analysis,
                'reference_sites_analysis': a.reference_sites_analysis,
                'combined_insights': a.combined_insights,
                'user_edits': a.user_edits,
            }

        # Get position categories
        position_names = list(
            questionnaire.position_categories.values_list('name', flat=True)
        )

        # Generate via AI
        gemini = GeminiClient()
        result = gemini.generate_questionnaire(
            confirmed_analysis=analysis_data,
            position_categories=position_names,
        )

        # Update questionnaire metadata
        if result.get('title'):
            questionnaire.title = result['title']
        if result.get('description'):
            questionnaire.description = result['description']
        questionnaire.save()

        # Create questions
        questions_data = result.get('questions', [])
        for i, q_data in enumerate(questions_data):
            question = Question.objects.create(
                questionnaire=questionnaire,
                text=q_data.get('text', ''),
                description=q_data.get('description', ''),
                question_type=q_data.get('question_type', Question.QuestionType.TEXTAREA),
                is_required=q_data.get('is_required', True),
                order=i,
                options=q_data.get('options', []),
            )

            # Link position categories
            q_positions = q_data.get('position_categories', [])
            if q_positions:
                categories = PositionCategory.objects.filter(
                    questionnaire=questionnaire,
                    name__in=q_positions,
                )
                question.position_categories.set(categories)

        project.status = Project.Status.QUESTIONNAIRE_READY
        project.save(update_fields=['status', 'updated_at'])

        logger.info(f"Questionnaire generated for project {project.id}: {len(questions_data)} questions")

    except Questionnaire.DoesNotExist:
        logger.error(f"Questionnaire not found: {questionnaire_id}")
    except Exception as exc:
        logger.error(f"Questionnaire generation failed: {exc}")
        raise self.retry(exc=exc)
