import logging

from celery import shared_task
from django.conf import settings
from django.core.mail import send_mail
from django.utils import timezone

logger = logging.getLogger(__name__)


@shared_task(bind=True, max_retries=3, default_retry_delay=60)
def send_invitation_emails(self, invitation_ids):
    """Send survey invitation emails for the given invitation IDs."""
    from .models import SurveyInvitation

    invitations = SurveyInvitation.objects.select_related(
        'employee', 'project',
    ).filter(id__in=invitation_ids)

    frontend_url = getattr(settings, 'FRONTEND_URL', 'http://localhost:3000')
    sent_count = 0

    for invitation in invitations:
        survey_url = f"{frontend_url}/survey/{invitation.token}"
        employee = invitation.employee

        try:
            send_mail(
                subject=f'[{invitation.project.title}] 설문조사 참여 요청',
                message=(
                    f'안녕하세요, {employee.name}님.\n\n'
                    f'{invitation.project.title} 프로젝트의 설문조사에 참여해 주세요.\n\n'
                    f'설문 링크: {survey_url}\n'
                    f'비밀번호: 전화번호 뒷자리 4자리\n\n'
                    f'만료일: {invitation.expires_at.strftime("%Y-%m-%d %H:%M")}\n\n'
                    f'감사합니다.'
                ),
                from_email=settings.DEFAULT_FROM_EMAIL,
                recipient_list=[employee.email],
                fail_silently=False,
            )

            invitation.status = SurveyInvitation.Status.SENT
            invitation.sent_at = timezone.now()
            invitation.save(update_fields=['status', 'sent_at'])
            sent_count += 1

        except Exception as exc:
            logger.error(
                'Failed to send invitation email to %s: %s',
                employee.email, exc,
            )
            # Retry on failure
            raise self.retry(exc=exc)

    logger.info('Successfully sent %d invitation email(s).', sent_count)
    return {'sent': sent_count, 'total': len(invitation_ids)}
