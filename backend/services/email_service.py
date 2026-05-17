import logging
import re

from django.conf import settings
from django.core.mail import send_mail
from django.template.loader import render_to_string
from django.utils.html import strip_tags

logger = logging.getLogger(__name__)

# 프로젝트 상태 라벨 — 메일 표시 시 제목 앞에 붙은 [상태] prefix를 제거하기 위해 사용
_STATUS_LABEL_PATTERN = re.compile(
    r'^\[\s*(?:'
    r'생성됨|분석중|분석완료|분석확인됨|질문지완료|배포중|'
    r'수집\s*중|마감됨|취합중|취합완료|브리프완료|완료'
    r')\s*\]\s*'
)


def _clean_project_title(title: str) -> str:
    """프로젝트 제목 앞에 붙은 시스템 상태 라벨([수집중] 등) prefix를 제거.

    의도적인 사용자 prefix(예: [중요], [긴급])는 그대로 유지됨.
    """
    if not title:
        return title
    return _STATUS_LABEL_PATTERN.sub('', title).strip()


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
        cleaned_title = _clean_project_title(invitation.project.title)

        context = {
            'employee_name': invitation.employee.name,
            'project_title': cleaned_title,
            'survey_url': survey_url,
            'expires_at': invitation.expires_at.strftime('%Y-%m-%d %H:%M'),
            'password': invitation.password_plain or '(비밀번호 발급 정보를 확인할 수 없습니다)',
            'interview_purpose': getattr(invitation.project, 'interview_purpose', '') or '',
        }

        try:
            html_content = render_to_string('emails/survey_invitation.html', context)
            text_content = strip_tags(html_content)

            send_mail(
                subject=f'[{cleaned_title}] 인터뷰 설문 요청',
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
