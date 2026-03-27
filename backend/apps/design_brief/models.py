from django.db import models
from apps.projects.models import Project
from apps.aggregation.models import Aggregation


class DesignBrief(models.Model):
    project = models.OneToOneField(Project, on_delete=models.CASCADE, related_name='design_brief')
    aggregation = models.ForeignKey(Aggregation, on_delete=models.SET_NULL, null=True)
    title = models.CharField(max_length=255)
    summary = models.TextField(blank=True)
    target_audience = models.TextField(blank=True)
    design_direction = models.TextField(blank=True)
    key_requirements = models.JSONField(default=list)
    selected_keywords = models.JSONField(default=list)
    selected_sentences = models.JSONField(default=list)
    tone_and_mood = models.JSONField(default=dict)
    color_preferences = models.JSONField(default=dict, blank=True)
    additional_notes = models.TextField(blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = 'design_brief_designbrief'

    def __str__(self):
        return f"Brief: {self.title}"


class StitchGeneration(models.Model):
    class Status(models.TextChoices):
        PENDING = 'pending'
        PROCESSING = 'processing'
        COMPLETED = 'completed'
        FAILED = 'failed'

    design_brief = models.ForeignKey(DesignBrief, on_delete=models.CASCADE, related_name='stitch_generations')
    prompt_text = models.TextField()
    reference_images = models.JSONField(default=list)
    stitch_project_id = models.CharField(max_length=255, blank=True)
    generated_html_url = models.URLField(blank=True)
    generated_screenshot_url = models.URLField(blank=True)
    generated_html_content = models.TextField(blank=True)
    version = models.PositiveIntegerField(default=1)
    status = models.CharField(max_length=20, choices=Status.choices, default=Status.PENDING)
    error_message = models.TextField(blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = 'design_brief_stitchgeneration'
        ordering = ['-version']

    def __str__(self):
        return f"Stitch v{self.version} for {self.design_brief}"
