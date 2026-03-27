import uuid
from django.conf import settings
from django.db import models


class Project(models.Model):
    class Status(models.TextChoices):
        CREATED = 'created', '생성됨'
        ANALYZING = 'analyzing', '분석중'
        ANALYSIS_READY = 'analysis_ready', '분석완료'
        ANALYSIS_CONFIRMED = 'analysis_confirmed', '분석확인됨'
        QUESTIONNAIRE_READY = 'questionnaire_ready', '질문지완료'
        DISTRIBUTING = 'distributing', '배포중'
        COLLECTING = 'collecting', '수집중'
        CLOSED = 'closed', '마감됨'
        AGGREGATING = 'aggregating', '취합중'
        AGGREGATION_READY = 'aggregation_ready', '취합완료'
        BRIEF_READY = 'brief_ready', '브리프완료'
        COMPLETED = 'completed', '완료'

    owner = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name='projects')
    title = models.CharField(max_length=255)
    client_name = models.CharField(max_length=255)
    client_contact_email = models.EmailField(blank=True)
    client_contact_phone = models.CharField(max_length=20, blank=True)
    requirements_text = models.TextField()
    existing_site_url = models.URLField(blank=True, null=True)
    status = models.CharField(max_length=30, choices=Status.choices, default=Status.CREATED)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = 'projects_project'
        ordering = ['-created_at']

    def __str__(self):
        return f"{self.title} - {self.client_name}"


class ReferenceSite(models.Model):
    project = models.ForeignKey(Project, on_delete=models.CASCADE, related_name='reference_sites')
    url = models.URLField()
    title = models.CharField(max_length=255, blank=True)
    description = models.TextField(blank=True)
    screenshot_path = models.CharField(max_length=500, blank=True)
    crawl_data = models.JSONField(default=dict, blank=True)
    order = models.PositiveIntegerField(default=0)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = 'projects_referencesite'
        ordering = ['order']

    def __str__(self):
        return f"{self.title or self.url}"
