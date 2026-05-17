from django.conf import settings
from django.db import models
from apps.projects.models import Project
from apps.distribution.models import Employee, SurveyInvitation
from apps.questionnaires.models import Question


class SurveyResponse(models.Model):
    invitation = models.OneToOneField(SurveyInvitation, on_delete=models.CASCADE, related_name='response')
    project = models.ForeignKey(Project, on_delete=models.CASCADE, related_name='survey_responses')
    employee = models.ForeignKey(Employee, on_delete=models.CASCADE, related_name='survey_responses')
    started_at = models.DateTimeField(auto_now_add=True)
    completed_at = models.DateTimeField(null=True, blank=True)
    is_manual = models.BooleanField(default=False)
    entered_by = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.SET_NULL, null=True, blank=True)

    class Meta:
        db_table = 'responses_surveyresponse'

    def __str__(self):
        return f"Response from {self.employee.name}"


class Answer(models.Model):
    response = models.ForeignKey(SurveyResponse, on_delete=models.CASCADE, related_name='answers')
    question = models.ForeignKey(Question, on_delete=models.CASCADE, related_name='answers')
    text_value = models.TextField(blank=True)
    choice_values = models.JSONField(default=list, blank=True)
    rating_value = models.IntegerField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = 'responses_answer'

    def __str__(self):
        return f"Answer to Q{self.question_id} by {self.response.employee.name}"


class ManualEntryDraft(models.Model):
    """대면 인터뷰 중 멤버 개인이 작성하는 메모성 응답.

    같은 인터뷰이(employee)에 대해 여러 멤버가 각자 draft를 작성할 수 있고,
    머지 단계를 거쳐 공식 SurveyResponse로 합쳐짐. draft 자체는 이력으로 보존.
    """
    project = models.ForeignKey(Project, on_delete=models.CASCADE, related_name='manual_drafts')
    employee = models.ForeignKey(Employee, on_delete=models.CASCADE, related_name='manual_drafts')
    author = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.CASCADE,
        related_name='manual_drafts',
    )
    is_submitted = models.BooleanField(default=False, help_text='멤버가 본인 작성 완료를 선언')
    submitted_at = models.DateTimeField(null=True, blank=True)
    started_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = 'responses_manualentrydraft'
        unique_together = [('employee', 'author')]
        ordering = ['-updated_at']

    def __str__(self):
        return f'Draft({self.employee.name} by {self.author_id})'


class ManualEntryDraftAnswer(models.Model):
    """ManualEntryDraft의 질문별 답변."""
    draft = models.ForeignKey(ManualEntryDraft, on_delete=models.CASCADE, related_name='answers')
    question = models.ForeignKey(Question, on_delete=models.CASCADE, related_name='manual_draft_answers')
    text_value = models.TextField(blank=True)
    choice_values = models.JSONField(default=list, blank=True)
    rating_value = models.IntegerField(null=True, blank=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = 'responses_manualentrydraftanswer'
        unique_together = [('draft', 'question')]
