from datetime import timedelta

import bcrypt
import pytest
from django.utils import timezone

from apps.distribution.models import Employee, SurveyInvitation
from apps.questionnaires.models import Questionnaire, Question
from apps.responses.models import SurveyResponse, Answer


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
class TestSurveyResponseModel:
    def test_str(self, survey_response):
        assert survey_response.employee.name in str(survey_response)

    def test_response_invitation_relation(self, survey_response, invitation):
        assert survey_response.invitation == invitation
        assert invitation.response == survey_response

    def test_default_not_manual(self, survey_response):
        assert survey_response.is_manual is False

    def test_completed_at_null_by_default(self, survey_response):
        assert survey_response.completed_at is None


@pytest.mark.django_db
class TestAnswerModel:
    def test_create_answer(self, survey_response, question):
        answer = Answer.objects.create(
            response=survey_response,
            question=question,
            text_value='Looks great!',
        )
        assert answer.text_value == 'Looks great!'
        assert answer.response == survey_response

    def test_answer_str(self, survey_response, question):
        answer = Answer.objects.create(
            response=survey_response,
            question=question,
            text_value='Test',
        )
        assert str(question.id) in str(answer)

    def test_answer_with_rating(self, survey_response, question):
        answer = Answer.objects.create(
            response=survey_response,
            question=question,
            rating_value=5,
        )
        assert answer.rating_value == 5

    def test_answer_with_choices(self, survey_response, question):
        answer = Answer.objects.create(
            response=survey_response,
            question=question,
            choice_values=['option_a', 'option_b'],
        )
        assert answer.choice_values == ['option_a', 'option_b']
