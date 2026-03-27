from datetime import datetime
from unittest.mock import MagicMock

import pytest
from django.core import mail

from services.email_service import EmailService


@pytest.fixture
def email_service():
    return EmailService()


@pytest.fixture
def mock_invitation():
    """Create a mock SurveyInvitation."""
    invitation = MagicMock()
    invitation.token = 'test-token-abc123'
    invitation.employee.name = '홍길동'
    invitation.employee.email = 'hong@example.com'
    invitation.project.title = '웹사이트 리뉴얼 프로젝트'
    invitation.expires_at = datetime(2026, 4, 30, 18, 0)
    return invitation


@pytest.mark.django_db
class TestSendSurveyInvitation:
    def test_send_survey_invitation(self, email_service, mock_invitation, settings):
        settings.FRONTEND_URL = 'http://localhost:3000'
        settings.DEFAULT_FROM_EMAIL = 'noreply@example.com'

        result = email_service.send_survey_invitation(mock_invitation)

        assert result is True
        assert len(mail.outbox) == 1

        sent_email = mail.outbox[0]
        assert '웹사이트 리뉴얼 프로젝트' in sent_email.subject
        assert 'hong@example.com' in sent_email.to
        assert sent_email.from_email == 'noreply@example.com'
        assert '홍길동' in sent_email.body
        assert 'test-token-abc123' in sent_email.alternatives[0][0]  # HTML content


@pytest.mark.django_db
class TestSendBulkInvitations:
    def test_send_bulk_invitations(self, email_service, settings):
        settings.FRONTEND_URL = 'http://localhost:3000'
        settings.DEFAULT_FROM_EMAIL = 'noreply@example.com'

        invitations = []
        for i, name in enumerate(['김철수', '이영희', '박민수']):
            inv = MagicMock()
            inv.token = f'token-{i}'
            inv.employee.name = name
            inv.employee.email = f'user{i}@example.com'
            inv.project.title = '테스트 프로젝트'
            inv.expires_at = datetime(2026, 4, 30, 18, 0)
            invitations.append(inv)

        result = email_service.send_bulk_invitations(invitations)

        assert result['sent'] == 3
        assert result['failed'] == 0
        assert len(result['errors']) == 0
        assert len(mail.outbox) == 3
