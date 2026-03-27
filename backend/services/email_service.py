import logging
from django.conf import settings
from django.core.mail import send_mail
from django.template.loader import render_to_string
from django.utils.html import strip_tags

logger = logging.getLogger(__name__)


class EmailService:
    """Handles sending survey invitation emails."""

    def send_survey_invitation(self, invitation) -> bool:
        """Send a survey invitation email to an employee.

        Args:
            invitation: SurveyInvitation instance

        Returns:
            True if sent successfully
        """
        survey_url = f"{settings.FRONTEND_URL}/survey/{invitation.token}"

        context = {
            'employee_name': invitation.employee.name,
            'project_title': invitation.project.title,
            'survey_url': survey_url,
            'expires_at': invitation.expires_at.strftime('%Y-%m-%d %H:%M'),
            'password_hint': '휴대폰 번호 뒷 4자리',
        }

        try:
            html_content = render_to_string('emails/survey_invitation.html', context)
            text_content = strip_tags(html_content)

            send_mail(
                subject=f'[인터뷰 설문] {invitation.project.title}',
                message=text_content,
                html_message=html_content,
                from_email=settings.DEFAULT_FROM_EMAIL,
                recipient_list=[invitation.employee.email],
                fail_silently=False,
            )
            logger.info(f"Survey invitation sent to {invitation.employee.email}")
            return True
        except Exception as e:
            logger.error(f"Failed to send invitation to {invitation.employee.email}: {e}")
            return False

    def send_bulk_invitations(self, invitations) -> dict:
        """Send multiple survey invitations.

        Returns:
            {sent: int, failed: int, errors: [str]}
        """
        result = {'sent': 0, 'failed': 0, 'errors': []}

        for invitation in invitations:
            if self.send_survey_invitation(invitation):
                result['sent'] += 1
            else:
                result['failed'] += 1
                result['errors'].append(f"Failed: {invitation.employee.email}")

        return result
