from datetime import timedelta

import bcrypt
import pytest
from django.utils import timezone
from rest_framework import status
from rest_framework.test import APIClient

from apps.distribution.models import Employee, SurveyInvitation
from apps.projects.models import Project
from apps.questionnaires.models import Questionnaire, Question
from apps.responses.models import SurveyResponse, Answer


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
    return Project.objects.create(
        owner=user,
        title='Test Project',
        client_name='Test Client',
        requirements_text='Test requirements',
        status=Project.Status.COLLECTING,
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


@pytest.fixture
def questionnaire(project):
    return Questionnaire.objects.create(
        project=project,
        title='Test Questionnaire',
    )


@pytest.fixture
def question(questionnaire):
    return Question.objects.create(
        questionnaire=questionnaire,
        text='How do you feel about the design?',
        question_type=Question.QuestionType.TEXTAREA,
    )


@pytest.fixture
def survey_response(invitation, project, employee):
    return SurveyResponse.objects.create(
        invitation=invitation,
        project=project,
        employee=employee,
    )


@pytest.mark.django_db
class TestResponseViews:
    def test_list_responses(self, api_client, project, survey_response):
        url = f'/api/v1/projects/{project.pk}/responses/'
        response = api_client.get(url)
        assert response.status_code == status.HTTP_200_OK
        assert len(response.data) == 1

    def test_response_detail(self, api_client, project, survey_response, question):
        Answer.objects.create(
            response=survey_response,
            question=question,
            text_value='Great design!',
        )
        url = f'/api/v1/projects/{project.pk}/responses/{survey_response.pk}/'
        response = api_client.get(url)
        assert response.status_code == status.HTTP_200_OK
        assert len(response.data['answers']) == 1

    def test_close_collection(self, api_client, project, invitation):
        url = f'/api/v1/projects/{project.pk}/responses/close/'
        response = api_client.post(url)
        assert response.status_code == status.HTTP_200_OK
        project.refresh_from_db()
        assert project.status == Project.Status.CLOSED

    def test_close_collection_wrong_status(self, api_client, project):
        project.status = Project.Status.CREATED
        project.save()
        url = f'/api/v1/projects/{project.pk}/responses/close/'
        response = api_client.post(url)
        assert response.status_code == status.HTTP_400_BAD_REQUEST


@pytest.mark.django_db
class TestManualEntryViews:
    def test_start_manual_entry(self, api_client, project, employee):
        url = f'/api/v1/projects/{project.pk}/manual-entry/start/'
        response = api_client.post(url, {'employee_id': employee.pk}, format='json')
        assert response.status_code == status.HTTP_201_CREATED
        assert 'response_id' in response.data

    def test_submit_manual_entry(self, api_client, project, employee, question):
        # Start session first
        start_url = f'/api/v1/projects/{project.pk}/manual-entry/start/'
        start_resp = api_client.post(start_url, {'employee_id': employee.pk}, format='json')
        response_id = start_resp.data['response_id']

        submit_url = f'/api/v1/projects/{project.pk}/manual-entry/submit/'
        data = {
            'response_id': response_id,
            'answers': [
                {
                    'question_id': question.pk,
                    'text_value': 'Manually entered answer',
                },
            ],
        }
        response = api_client.post(submit_url, data, format='json')
        assert response.status_code == status.HTTP_200_OK

        survey_resp = SurveyResponse.objects.get(pk=response_id)
        assert survey_resp.completed_at is not None
        assert survey_resp.answers.count() == 1
