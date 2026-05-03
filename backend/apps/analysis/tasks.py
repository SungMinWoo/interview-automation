"""Celery tasks for the analysis app."""

import logging
from celery import shared_task

logger = logging.getLogger(__name__)


@shared_task(bind=True, max_retries=3, default_retry_delay=30)
def run_project_analysis(self, project_id: int, ai_provider: str | None = None) -> None:
    """Analyse the project's existing site and reference sites using AI."""
    from apps.projects.models import Project
    from .models import ProjectAnalysis, SiteAnalysis
    from services.ai_client import get_ai_client
    from services.crawler_service import CrawlerService

    try:
        project = Project.objects.get(pk=project_id)
        analysis = ProjectAnalysis.objects.get(project=project)
        analysis.status = ProjectAnalysis.Status.PROCESSING
        analysis.error_message = ''
        analysis.save(update_fields=['status', 'error_message', 'updated_at'])

        project.status = Project.Status.ANALYZING
        project.save(update_fields=['status', 'updated_at'])

        # Clean up previous SiteAnalysis records to avoid duplicates on retry
        SiteAnalysis.objects.filter(project=project).delete()

        crawler = CrawlerService()

        # Crawl existing site
        existing_site_data = None
        if project.existing_site_url:
            crawl_result = crawler.crawl(project.existing_site_url)
            SiteAnalysis.objects.create(
                project=project,
                is_existing_site=True,
                url=project.existing_site_url,
                crawl_text=crawl_result.get('main_text', ''),
                ai_analysis=crawl_result,
            )
            existing_site_data = {
                'url': project.existing_site_url,
                'crawl_text': crawl_result.get('main_text', ''),
            }

        # Crawl reference sites
        reference_sites_data = []
        for ref_site in project.reference_sites.all():
            crawl_result = crawler.crawl(ref_site.url)
            ref_site.crawl_data = crawl_result
            ref_site.save(update_fields=['crawl_data'])

            SiteAnalysis.objects.create(
                project=project,
                reference_site=ref_site,
                url=ref_site.url,
                crawl_text=crawl_result.get('main_text', ''),
                ai_analysis=crawl_result,
            )
            reference_sites_data.append({
                'url': ref_site.url,
                'crawl_text': crawl_result.get('main_text', ''),
            })

        # Gather uploaded file contents
        from apps.projects.models import ProjectFile
        file_contents = []
        for pf in ProjectFile.objects.filter(project=project):
            text = pf.extracted_text or ''
            summary = pf.ai_summary or ''
            if text or summary:
                file_contents.append({
                    'file_name': pf.original_name,
                    'content': text[:5000],
                    'ai_summary': summary,
                })

        # Run AI analysis
        ai_client = get_ai_client(ai_provider)
        result = ai_client.analyze_project(
            requirements_text=project.requirements_text,
            existing_site_data=existing_site_data,
            reference_sites_data=reference_sites_data,
            file_contents=file_contents,
            project_type=project.project_type,
        )

        analysis.requirements_summary = result.get('requirements_summary', '')
        analysis.existing_site_analysis = result.get('existing_site_analysis', {})
        analysis.reference_sites_analysis = result.get('reference_sites_analysis', {})
        analysis.combined_insights = result.get('combined_insights', {})
        analysis.raw_ai_response = result
        analysis.status = ProjectAnalysis.Status.COMPLETED
        analysis.error_message = ''
        analysis.save()

        project.status = Project.Status.ANALYSIS_READY
        project.save(update_fields=['status', 'updated_at'])

        from apps.notifications.tasks import create_project_notifications
        create_project_notifications.delay(
            project_id=project.id,
            event_type='analysis_completed',
            title=f'{project.title} — 분석이 완료되었습니다',
        )

        logger.info(f"Analysis completed for project {project_id}")

    except (Project.DoesNotExist, ProjectAnalysis.DoesNotExist):
        logger.error(f"Project or analysis not found: {project_id}")
    except Exception as exc:
        logger.error(f"Analysis failed for project {project_id}: {exc}")
        try:
            analysis = ProjectAnalysis.objects.get(project_id=project_id)
            analysis.status = ProjectAnalysis.Status.FAILED
            analysis.error_message = str(exc)
            analysis.save(update_fields=['status', 'error_message', 'updated_at'])
        except ProjectAnalysis.DoesNotExist:
            pass
        raise self.retry(exc=exc)
