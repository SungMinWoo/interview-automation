import uuid
from datetime import timedelta

import pytest
from django.utils import timezone

from apps.distribution.models import Employee, SurveyInvitation


@pytest.mark.django_db
class TestEmployeeModel:
    def test_str(self, employee):
        assert employee.name in str(employee)
        assert employee.position in str(employee)

    def test_employee_project_relation(self, employee, project):
        assert employee.project == project
        assert employee in project.employees.all()


@pytest.mark.django_db
class TestSurveyInvitationModel:
    def test_str(self, invitation):
        assert invitation.employee.name in str(invitation)

    def test_token_is_uuid(self, invitation):
        assert isinstance(invitation.token, uuid.UUID)

    def test_is_expired_false(self, invitation):
        invitation.expires_at = timezone.now() + timedelta(days=1)
        invitation.save()
        assert invitation.is_expired is False

    def test_is_expired_true(self, invitation):
        invitation.expires_at = timezone.now() - timedelta(days=1)
        invitation.save()
        assert invitation.is_expired is True

    def test_default_status(self, invitation):
        assert invitation.status == SurveyInvitation.Status.PENDING


@pytest.fixture
def user(db):
    from apps.accounts.models import User
    return User.objects.create_user(
        username='testuser', email='test@example.com', password='testpass123',
    )


@pytest.fixture
def project(user):
    from apps.projects.models import Project
    return Project.objects.create(
        owner=user,
        title='Test Project',
        client_name='Test Client',
        requirements_text='Test requirements',
    )


@pytest.fixture
def employee(project):
    return Employee.objects.create(
        project=project,
        name='홍길동',
        email='hong@example.com',
        phone='010-1234-5678',
        position='디자이너',
    )


@pytest.fixture
def invitation(employee, project):
    import bcrypt
    password_hash = bcrypt.hashpw(b'5678', bcrypt.gensalt()).decode('utf-8')
    return SurveyInvitation.objects.create(
        employee=employee,
        project=project,
        password_hash=password_hash,
        expires_at=timezone.now() + timedelta(days=7),
    )
