from django.db import models
from apps.projects.models import Project
from apps.questionnaires.models import Question


class Aggregation(models.Model):
    class Status(models.TextChoices):
        PENDING = 'pending'
        PROCESSING = 'processing'
        COMPLETED = 'completed'
        FAILED = 'failed'

    class AiProvider(models.TextChoices):
        CLAUDE = 'claude', 'Claude'
        GEMINI = 'gemini', 'Gemini'

    project = models.ForeignKey(Project, on_delete=models.CASCADE, related_name='aggregations')
    status = models.CharField(max_length=20, choices=Status.choices, default=Status.PENDING)
    ai_provider = models.CharField(max_length=20, choices=AiProvider.choices, default=AiProvider.CLAUDE)
    version = models.PositiveIntegerField(default=1)
    raw_ai_response = models.JSONField(default=dict)
    summary = models.TextField(blank=True)
    section_summaries = models.JSONField(default=list)
    company_direction = models.TextField(blank=True)
    desired_changes = models.JSONField(default=list)
    company_values = models.JSONField(default=list)
    error_message = models.TextField(blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = 'aggregation_aggregation'
        ordering = ['-version']

    def __str__(self):
        return f"Aggregation v{self.version} for {self.project}"


class ExtractedKeyword(models.Model):
    aggregation = models.ForeignKey(Aggregation, on_delete=models.CASCADE, related_name='keywords')
    text = models.CharField(max_length=255)
    category = models.CharField(max_length=100, blank=True)
    weight = models.FloatField(default=1.0)
    is_user_added = models.BooleanField(default=False)
    order = models.PositiveIntegerField(default=0)

    class Meta:
        db_table = 'aggregation_extractedkeyword'
        ordering = ['order']

    def __str__(self):
        return self.text


class ExtractedSentence(models.Model):
    aggregation = models.ForeignKey(Aggregation, on_delete=models.CASCADE, related_name='sentences')
    text = models.TextField()
    category = models.CharField(max_length=100, blank=True)
    source_question = models.ForeignKey(Question, on_delete=models.SET_NULL, null=True, blank=True)
    is_user_added = models.BooleanField(default=False)
    order = models.PositiveIntegerField(default=0)

    class Meta:
        db_table = 'aggregation_extractedsentence'
        ordering = ['order']

    def __str__(self):
        return self.text[:60]
