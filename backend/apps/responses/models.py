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
