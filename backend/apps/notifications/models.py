from django.conf import settings
from django.db import models


class Notification(models.Model):
    class EventType(models.TextChoices):
        STATUS_CHANGED = 'status_changed', '상태 변경'
        MEMBER_ADDED = 'member_added', '멤버 추가'
        MEMBER_REMOVED = 'member_removed', '멤버 제거'
        MEMBER_ROLE_CHANGED = 'member_role_changed', '역할 변경'
        ANALYSIS_COMPLETED = 'analysis_completed', '분석 완료'
        ANALYSIS_CONFIRMED = 'analysis_confirmed', '분석 확인'
        QUESTIONNAIRE_READY = 'questionnaire_ready', '질문지 준비'
        QUESTIONNAIRE_CONFIRMED = 'questionnaire_confirmed', '질문지 확정'
        INVITATIONS_SENT = 'invitations_sent', '초대 발송'
        COLLECTION_CLOSED = 'collection_closed', '수집 마감'
        AGGREGATION_COMPLETED = 'aggregation_completed', '취합 완료'
        BRIEF_READY = 'brief_ready', '브리프 완료'
        OWNERSHIP_TRANSFERRED = 'ownership_transferred', '소유권 이전'

    recipient = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name='notifications',
    )
    project = models.ForeignKey(
        'projects.Project',
        on_delete=models.CASCADE,
        related_name='notifications',
        null=True, blank=True,
    )
    event_type = models.CharField(max_length=40, choices=EventType.choices)
    title = models.CharField(max_length=200)
    message = models.TextField(blank=True)
    detail = models.JSONField(default=dict, blank=True)
    actor_id = models.IntegerField(null=True, blank=True, help_text='행위자 User ID (비정규화)')
    actor_name = models.CharField(max_length=100, blank=True, help_text='행위자 이름 (비정규화)')
    is_read = models.BooleanField(default=False)
    read_at = models.DateTimeField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = 'notifications_notification'
        ordering = ['-created_at']
        indexes = [
            models.Index(fields=['recipient', 'is_read', '-created_at']),
        ]

    def __str__(self):
        return f'[{self.event_type}] {self.title} → {self.recipient}'
