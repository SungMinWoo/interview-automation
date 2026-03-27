from django.db import models
from apps.projects.models import Project


class Questionnaire(models.Model):
    project = models.OneToOneField(Project, on_delete=models.CASCADE, related_name='questionnaire')
    title = models.CharField(max_length=255)
    description = models.TextField(blank=True)
    ai_generation_prompt = models.TextField(blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = 'questionnaires_questionnaire'

    def __str__(self):
        return f"{self.title}"


class PositionCategory(models.Model):
    questionnaire = models.ForeignKey(Questionnaire, on_delete=models.CASCADE, related_name='position_categories')
    name = models.CharField(max_length=100)
    order = models.PositiveIntegerField(default=0)

    class Meta:
        db_table = 'questionnaires_positioncategory'
        ordering = ['order']

    def __str__(self):
        return self.name


class Question(models.Model):
    class QuestionType(models.TextChoices):
        TEXT = 'text', '단답형'
        TEXTAREA = 'textarea', '서술형'
        SINGLE_CHOICE = 'single_choice', '단일선택'
        MULTIPLE_CHOICE = 'multiple_choice', '복수선택'
        RATING = 'rating', '평점'
        RANKING = 'ranking', '순위'

    questionnaire = models.ForeignKey(Questionnaire, on_delete=models.CASCADE, related_name='questions')
    text = models.TextField()
    description = models.TextField(blank=True)
    question_type = models.CharField(max_length=20, choices=QuestionType.choices, default=QuestionType.TEXTAREA)
    is_required = models.BooleanField(default=True)
    order = models.PositiveIntegerField(default=0)
    options = models.JSONField(default=list, blank=True)
    position_categories = models.ManyToManyField(PositionCategory, blank=True, related_name='questions')
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = 'questionnaires_question'
        ordering = ['order']

    def __str__(self):
        return self.text[:50]
