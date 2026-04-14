"""Celery tasks for the questionnaires app."""

import logging
from celery import shared_task
from django.db import models

logger = logging.getLogger(__name__)


@shared_task(bind=True, max_retries=3, default_retry_delay=30)
def generate_questionnaire(self, questionnaire_id: int, ai_provider: str | None = None) -> None:
    """Generate interview questions using AI."""
    from apps.projects.models import Project
    from .models import Questionnaire, QuestionSection, Question, PositionCategory
    from services.ai_client import get_ai_client

    try:
        questionnaire = Questionnaire.objects.get(pk=questionnaire_id)
        project = questionnaire.project

        questionnaire.status = Questionnaire.Status.PROCESSING
        questionnaire.error_message = ''
        questionnaire.save(update_fields=['status', 'error_message', 'updated_at'])

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
        ai_client = get_ai_client(ai_provider)
        result = ai_client.generate_questionnaire(
            confirmed_analysis=analysis_data,
            position_categories=position_names,
        )

        # Update questionnaire metadata
        if result.get('title'):
            questionnaire.title = result['title']
        if result.get('description'):
            questionnaire.description = result['description']

        # Create sections and questions
        existing_section_order = questionnaire.sections.aggregate(
            max_order=models.Max('order')
        )['max_order'] or -1
        existing_q_order = questionnaire.questions.aggregate(
            max_order=models.Max('order')
        )['max_order'] or -1

        sections_data = result.get('sections', [])
        q_order = existing_q_order

        if sections_data:
            # New format: sections with nested questions
            for s_idx, s_data in enumerate(sections_data):
                section = QuestionSection.objects.create(
                    questionnaire=questionnaire,
                    title=s_data.get('title', f'파트 {s_idx + 1}'),
                    description=s_data.get('description', ''),
                    importance=s_data.get('importance', 'medium'),
                    target_area=s_data.get('target_area', '공통'),
                    order=existing_section_order + 1 + s_idx,
                )

                for q_data in s_data.get('questions', []):
                    q_order += 1
                    Question.objects.create(
                        questionnaire=questionnaire,
                        section=section,
                        sub_category=q_data.get('sub_category', ''),
                        text=q_data.get('text', ''),
                        description=q_data.get('description', ''),
                        question_type=q_data.get('question_type', Question.QuestionType.TEXTAREA),
                        order=q_order,
                        options=q_data.get('options', []),
                        importance=q_data.get('importance', 'important'),
                        purpose=q_data.get('purpose', ''),
                    )
        else:
            # Fallback: flat questions list (backward compatibility)
            for q_data in result.get('questions', []):
                q_order += 1
                Question.objects.create(
                    questionnaire=questionnaire,
                    text=q_data.get('text', ''),
                    description=q_data.get('description', ''),
                    question_type=q_data.get('question_type', Question.QuestionType.TEXTAREA),
                    order=q_order,
                    options=q_data.get('options', []),
                    importance=q_data.get('importance', 'important'),
                    purpose=q_data.get('purpose', ''),
                )

        questionnaire.status = Questionnaire.Status.COMPLETED
        questionnaire.save(update_fields=['status', 'updated_at'])

        project.status = Project.Status.QUESTIONNAIRE_READY
        project.save(update_fields=['status', 'updated_at'])

        total_questions = questionnaire.questions.count()
        logger.info(f"Questionnaire generated for project {project.id}: {total_questions} questions")

    except Questionnaire.DoesNotExist:
        logger.error(f"Questionnaire not found: {questionnaire_id}")
    except Exception as exc:
        logger.error(f"Questionnaire generation failed: {exc}")
        try:
            questionnaire = Questionnaire.objects.get(pk=questionnaire_id)
            questionnaire.status = Questionnaire.Status.FAILED
            questionnaire.error_message = str(exc)
            questionnaire.save(update_fields=['status', 'error_message', 'updated_at'])
        except Questionnaire.DoesNotExist:
            pass
        raise self.retry(exc=exc)
