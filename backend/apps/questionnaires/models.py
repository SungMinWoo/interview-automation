from django.db import models
from apps.projects.models import Project


class Questionnaire(models.Model):
    class Status(models.TextChoices):
        PENDING = 'pending'
        PROCESSING = 'processing'
        COMPLETED = 'completed'
        CONFIRMED = 'confirmed'
        FAILED = 'failed'

    class AiProvider(models.TextChoices):
        CLAUDE = 'claude', 'Claude'
        GEMINI = 'gemini', 'Gemini'

    project = models.OneToOneField(Project, on_delete=models.CASCADE, related_name='questionnaire')
    title = models.CharField(max_length=255)
    description = models.TextField(blank=True)
    status = models.CharField(max_length=20, choices=Status.choices, default=Status.PENDING)
    ai_generation_prompt = models.TextField(blank=True)
    ai_provider = models.CharField(max_length=20, choices=AiProvider.choices, default=AiProvider.CLAUDE)
    error_message = models.TextField(blank=True)
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


class QuestionSection(models.Model):
    """구분 — 질문지의 대분류 (e.g., Project Overview, Service Image, UX/UI Design)"""

    class SectionImportance(models.TextChoices):
        HIGH = 'high', '상'
        MEDIUM = 'medium', '중'
        LOW = 'low', '하'

    questionnaire = models.ForeignKey(Questionnaire, on_delete=models.CASCADE, related_name='sections')
    title = models.CharField(max_length=255, help_text='구분 (e.g., Project Overview)')
    description = models.TextField(blank=True, help_text='구분 설명')
    importance = models.CharField(
        max_length=10, choices=SectionImportance.choices,
        default=SectionImportance.MEDIUM, help_text='질문영역 중요도 (상/중/하)',
    )
    target_area = models.CharField(
        max_length=50, blank=True, default='공통',
        help_text='질문 영역 (공통, FO 등)',
    )
    order = models.PositiveIntegerField(default=0)
    target_positions = models.ManyToManyField(
        'projects.ProjectPosition', blank=True, related_name='question_sections',
        help_text='비어있으면 모든 직급 대상',
    )

    class Meta:
        db_table = 'questionnaires_questionsection'
        ordering = ['order']

    def __str__(self):
        return self.title


class Question(models.Model):
    class QuestionType(models.TextChoices):
        TEXT = 'text', '단답형'
        TEXTAREA = 'textarea', '서술형'
        SINGLE_CHOICE = 'single_choice', '단일선택'
        MULTIPLE_CHOICE = 'multiple_choice', '복수선택'
        RATING = 'rating', '평점'
        RANKING = 'ranking', '순위'

    class Importance(models.TextChoices):
        REQUIRED = 'required', '필수'
        IMPORTANT = 'important', '중요'
        OPTIONAL = 'optional', '선택'

    questionnaire = models.ForeignKey(Questionnaire, on_delete=models.CASCADE, related_name='questions')
    section = models.ForeignKey(QuestionSection, on_delete=models.CASCADE, related_name='questions', null=True, blank=True)
    sub_category = models.CharField(max_length=100, blank=True, help_text='세부구분 (e.g., 직무/포지션, 전략/로드맵)')
    text = models.TextField()
    description = models.TextField(blank=True)
    question_type = models.CharField(max_length=20, choices=QuestionType.choices, default=QuestionType.TEXTAREA)
    order = models.PositiveIntegerField(default=0)
    options = models.JSONField(default=list, blank=True)
    importance = models.CharField(max_length=20, choices=Importance.choices, default=Importance.IMPORTANT)
    purpose = models.TextField(blank=True)
    position_categories = models.ManyToManyField(PositionCategory, blank=True, related_name='questions')
    target_departments = models.ManyToManyField(
        'projects.ProjectDepartment', blank=True, related_name='targeted_questions',
        help_text='비어있으면 모든 부서 대상',
    )
    target_positions = models.ManyToManyField(
        'projects.ProjectPosition', blank=True, related_name='targeted_questions',
        help_text='비어있으면 모든 직급 대상',
    )
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = 'questionnaires_question'
        ordering = ['order']

    def __str__(self):
        return self.text[:50]
