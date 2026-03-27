from datetime import timedelta

import bcrypt
import pytest
from django.utils import timezone
from rest_framework import status
from rest_framework.test import APIClient

from apps.distribution.models import Employee, SurveyInvitation


@pytest.fixture
def user(db):
    from apps.accounts.models import User
    return User.objects.create_user(
        username='testuser', email='test@example.com', password='testpass123',
    )


@pytest.fixture
def api_client(user):
    client = APIClient()
    client.force_authenticate(user=user)
    return client


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
    password_hash = bcrypt.hashpw(b'5678', bcrypt.gensalt()).decode('utf-8')
    return SurveyInvitation.objects.create(
        employee=employee,
        project=project,
        password_hash=password_hash,
        expires_at=timezone.now() + timedelta(days=7),
    )


@pytest.mark.django_db
class TestEmployeeViewSet:
    def test_list_employees(self, api_client, project, employee):
        url = f'/api/v1/projects/{project.pk}/employees/'
        response = api_client.get(url)
        assert response.status_code == status.HTTP_200_OK

    def test_create_employee(self, api_client, project):
        url = f'/api/v1/projects/{project.pk}/employees/'
        data = {
            'name': '김철수',
            'email': 'kim@example.com',
            'phone': '010-9876-5432',
            'position': '개발자',
        }
        response = api_client.post(url, data, format='json')
        assert response.status_code == status.HTTP_201_CREATED
        assert Employee.objects.filter(name='김철수').exists()

    def test_bulk_create_employees(self, api_client, project):
        url = f'/api/v1/projects/{project.pk}/employees/bulk/'
        data = {
            'employees': [
                {
                    'name': '직원A',
                    'email': 'a@example.com',
                    'phone': '010-0000-1111',
                    'position': 'PM',
                },
                {
                    'name': '직원B',
                    'email': 'b@example.com',
                    'phone': '010-0000-2222',
                    'position': '기획자',
                },
            ],
        }
        response = api_client.post(url, data, format='json')
        assert response.status_code == status.HTTP_201_CREATED
        assert len(response.data) == 2


@pytest.mark.django_db
class TestInvitationViews:
    def test_generate_invitations(self, api_client, project, employee):
        url = f'/api/v1/projects/{project.pk}/invitations/generate/'
        response = api_client.post(url)
        assert response.status_code == status.HTTP_201_CREATED
        assert response.data['created_count'] == 1
        assert SurveyInvitation.objects.filter(employee=employee).exists()

    def test_list_invitations(self, api_client, project, invitation):
        url = f'/api/v1/projects/{project.pk}/invitations/'
        response = api_client.get(url)
        assert response.status_code == status.HTTP_200_OK
        assert len(response.data) == 1


@pytest.mark.django_db
class TestPublicSurveyViews:
    def test_survey_info(self, invitation):
        client = APIClient()
        url = f'/api/v1/survey/{invitation.token}/'
        response = client.get(url)
        assert response.status_code == status.HTTP_200_OK
        assert response.data['employee_name'] == invitation.employee.name

    def test_survey_verify_correct_password(self, invitation):
        client = APIClient()
        url = f'/api/v1/survey/{invitation.token}/verify/'
        response = client.post(url, {'password': '5678'}, format='json')
        assert response.status_code == status.HTTP_200_OK
        assert 'access_token' in response.data

    def test_survey_verify_wrong_password(self, invitation):
        client = APIClient()
        url = f'/api/v1/survey/{invitation.token}/verify/'
        response = client.post(url, {'password': '0000'}, format='json')
        assert response.status_code == status.HTTP_401_UNAUTHORIZED

    def test_survey_verify_expired(self, invitation):
        invitation.expires_at = timezone.now() - timedelta(days=1)
        invitation.save()
        client = APIClient()
        url = f'/api/v1/survey/{invitation.token}/verify/'
        response = client.post(url, {'password': '5678'}, format='json')
        assert response.status_code == status.HTTP_410_GONE
