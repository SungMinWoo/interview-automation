from django.db import models
from apps.projects.models import Project, ReferenceSite


class SiteAnalysis(models.Model):
    project = models.ForeignKey(Project, on_delete=models.CASCADE, related_name='site_analyses')
    reference_site = models.ForeignKey(ReferenceSite, on_delete=models.CASCADE, null=True, blank=True)
    is_existing_site = models.BooleanField(default=False)
    url = models.URLField()
    screenshot_url = models.CharField(max_length=500, blank=True)
    crawl_text = models.TextField(blank=True)
    ai_analysis = models.JSONField(default=dict)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = 'analysis_siteanalysis'

    def __str__(self):
        return f"SiteAnalysis({self.url})"


class ProjectAnalysis(models.Model):
    class Status(models.TextChoices):
        PENDING = 'pending'
        PROCESSING = 'processing'
        COMPLETED = 'completed'
        CONFIRMED = 'confirmed'
        FAILED = 'failed'

    class AiProvider(models.TextChoices):
        CLAUDE = 'claude', 'Claude'
        GEMINI = 'gemini', 'Gemini'

    project = models.OneToOneField(Project, on_delete=models.CASCADE, related_name='analysis')
    status = models.CharField(max_length=20, choices=Status.choices, default=Status.PENDING)
    ai_provider = models.CharField(max_length=20, choices=AiProvider.choices, default=AiProvider.CLAUDE)
    requirements_summary = models.TextField(blank=True)
    existing_site_analysis = models.JSONField(default=dict)
    reference_sites_analysis = models.JSONField(default=dict)
    combined_insights = models.JSONField(default=dict)
    user_edits = models.JSONField(default=dict, blank=True)
    confirmed_at = models.DateTimeField(null=True, blank=True)
    raw_ai_response = models.JSONField(default=dict)
    error_message = models.TextField(blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = 'analysis_projectanalysis'

    def __str__(self):
        return f"ProjectAnalysis(project={self.project_id}, status={self.status})"
