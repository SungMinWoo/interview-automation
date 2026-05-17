import uuid
from django.conf import settings
from django.db import models
from apps.projects.models import Project
from apps.questionnaires.models import PositionCategory


class Employee(models.Model):
    project = models.ForeignKey(Project, on_delete=models.CASCADE, related_name='employees')
    name = models.CharField(max_length=255)
    email = models.EmailField()
    phone = models.CharField(max_length=20, blank=True)
    position = models.CharField(max_length=255)
    position_category = models.ForeignKey(PositionCategory, on_delete=models.SET_NULL, null=True, blank=True)
    department = models.CharField(max_length=255, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = 'distribution_employee'

    def __str__(self):
        return f"{self.name} ({self.position})"


class SurveyInvitation(models.Model):
    class Status(models.TextChoices):
        PENDING = 'pending', '대기중'
        SENT = 'sent', '발송됨'
        OPENED = 'opened', '열람함'
        COMPLETED = 'completed', '완료'
        EXPIRED = 'expired', '만료됨'

    employee = models.OneToOneField(Employee, on_delete=models.CASCADE, related_name='invitation')
    project = models.ForeignKey(Project, on_delete=models.CASCADE, related_name='invitations')
    token = models.UUIDField(default=uuid.uuid4, unique=True, editable=False)
    password_hash = models.CharField(max_length=128)
    # 평문 — 메일 본문 / 배포 페이지 노출용. 응답 완료 시 빈 문자열로 폐기되어 노출 윈도우를 최소화.
    password_plain = models.CharField(max_length=20, blank=True)
    status = models.CharField(max_length=20, choices=Status.choices, default=Status.PENDING)
    expires_at = models.DateTimeField()
    sent_at = models.DateTimeField(null=True, blank=True)
    opened_at = models.DateTimeField(null=True, blank=True)
    completed_at = models.DateTimeField(null=True, blank=True)
    is_manual_entry = models.BooleanField(default=False)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = 'distribution_surveyinvitation'

    def __str__(self):
        return f"Invitation for {self.employee.name}"

    @property
    def is_expired(self):
        from django.utils import timezone
        return timezone.now() > self.expires_at
