import logging

from celery import shared_task
from django.utils import timezone

logger = logging.getLogger(__name__)


@shared_task(bind=True, max_retries=3, default_retry_delay=60)
def send_invitation_emails(self, invitation_ids):
    """Send survey invitation emails for the given invitation IDs.

    EmailService를 통해 HTML 템플릿(`templates/emails/survey_invitation.html`)으로 발송.
    """
    from .models import SurveyInvitation
    from services.email_service import EmailService

    invitations = SurveyInvitation.objects.select_related(
        'employee', 'project',
    ).filter(id__in=invitation_ids)

    service = EmailService()
    sent_count = 0
    failed = []

    for invitation in invitations:
        ok = service.send_survey_invitation(invitation)
        if ok:
            invitation.status = SurveyInvitation.Status.SENT
            invitation.sent_at = timezone.now()
            invitation.save(update_fields=['status', 'sent_at'])
            sent_count += 1
        else:
            failed.append(invitation.id)

    if failed:
        logger.error('Failed to send %d invitation(s): %s', len(failed), failed)
        # 부분 실패는 재시도하지 않음 — 성공한 건들의 sent 상태를 보존하기 위해.
        # 개별 재발송은 단건 resend API로 처리.

    logger.info('Successfully sent %d / %d invitation email(s).', sent_count, len(invitation_ids))
    return {'sent': sent_count, 'total': len(invitation_ids), 'failed': failed}
