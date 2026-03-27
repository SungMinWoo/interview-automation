from django.test import TestCase
from django.contrib.auth import get_user_model
from rest_framework.test import APIClient
from rest_framework import status

from apps.projects.models import Project
from apps.questionnaires.models import Questionnaire, PositionCategory, Question

User = get_user_model()


class QuestionnaireViewTestBase(TestCase):
    def setUp(self):
        self.client = APIClient()
        self.user = User.objects.create_user(
            username='tester', email='t@t.com', password='testpass123',
        )
        self.client.force_authenticate(user=self.user)
        self.project = Project.objects.create(
            owner=self.user,
            title='Test Project',
            client_name='Client',
            requirements_text='Build a website.',
        )


class GenerateQuestionnaireViewTest(QuestionnaireViewTestBase):
    def test_generate_creates_questionnaire(self):
        url = f'/api/projects/{self.project.id}/questionnaire/generate/'
        response = self.client.post(url)
        self.assertEqual(response.status_code, status.HTTP_202_ACCEPTED)
        self.assertTrue(Questionnaire.objects.filter(project=self.project).exists())

    def test_generate_requires_auth(self):
        self.client.force_authenticate(user=None)
        url = f'/api/projects/{self.project.id}/questionnaire/generate/'
        response = self.client.post(url)
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)

    def test_generate_rejects_other_user(self):
        other = User.objects.create_user(
            username='other', email='o@o.com', password='testpass123',
        )
        self.client.force_authenticate(user=other)
        url = f'/api/projects/{self.project.id}/questionnaire/generate/'
        response = self.client.post(url)
        self.assertEqual(response.status_code, status.HTTP_404_NOT_FOUND)


class QuestionnaireDetailViewTest(QuestionnaireViewTestBase):
    def setUp(self):
        super().setUp()
        self.questionnaire = Questionnaire.objects.create(
            project=self.project,
            title='Test Questionnaire',
        )

    def test_get_questionnaire(self):
        url = f'/api/projects/{self.project.id}/questionnaire/'
        response = self.client.get(url)
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data['title'], 'Test Questionnaire')

    def test_patch_questionnaire(self):
        url = f'/api/projects/{self.project.id}/questionnaire/'
        response = self.client.patch(url, {'title': 'Updated'}, format='json')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data['title'], 'Updated')


class QuestionViewSetTest(QuestionnaireViewTestBase):
    def setUp(self):
        super().setUp()
        self.questionnaire = Questionnaire.objects.create(
            project=self.project,
            title='Test Questionnaire',
        )

    def test_create_question(self):
        url = f'/api/projects/{self.project.id}/questionnaire/questions/'
        data = {'text': 'What is the goal?', 'question_type': 'textarea'}
        response = self.client.post(url, data, format='json')
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertEqual(response.data['text'], 'What is the goal?')

    def test_list_questions(self):
        Question.objects.create(
            questionnaire=self.questionnaire,
            text='Q1', order=0,
        )
        url = f'/api/projects/{self.project.id}/questionnaire/questions/'
        response = self.client.get(url)
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(response.data), 1)

    def test_update_question(self):
        q = Question.objects.create(
            questionnaire=self.questionnaire,
            text='Q1', order=0,
        )
        url = f'/api/projects/{self.project.id}/questionnaire/questions/{q.id}/'
        response = self.client.patch(url, {'text': 'Updated Q1'}, format='json')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data['text'], 'Updated Q1')

    def test_delete_question(self):
        q = Question.objects.create(
            questionnaire=self.questionnaire,
            text='Q1', order=0,
        )
        url = f'/api/projects/{self.project.id}/questionnaire/questions/{q.id}/'
        response = self.client.delete(url)
        self.assertEqual(response.status_code, status.HTTP_204_NO_CONTENT)
        self.assertFalse(Question.objects.filter(id=q.id).exists())


class QuestionReorderViewTest(QuestionnaireViewTestBase):
    def setUp(self):
        super().setUp()
        self.questionnaire = Questionnaire.objects.create(
            project=self.project,
            title='Test Questionnaire',
        )

    def test_reorder_questions(self):
        q1 = Question.objects.create(questionnaire=self.questionnaire, text='Q1', order=0)
        q2 = Question.objects.create(questionnaire=self.questionnaire, text='Q2', order=1)
        url = f'/api/projects/{self.project.id}/questionnaire/questions/reorder/'
        data = [{'id': q1.id, 'order': 2}, {'id': q2.id, 'order': 1}]
        response = self.client.post(url, data, format='json')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        q1.refresh_from_db()
        q2.refresh_from_db()
        self.assertEqual(q1.order, 2)
        self.assertEqual(q2.order, 1)

    def test_reorder_invalid_ids(self):
        url = f'/api/projects/{self.project.id}/questionnaire/questions/reorder/'
        data = [{'id': 9999, 'order': 0}]
        response = self.client.post(url, data, format='json')
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)


class PositionCategoryViewSetTest(QuestionnaireViewTestBase):
    def setUp(self):
        super().setUp()
        self.questionnaire = Questionnaire.objects.create(
            project=self.project,
            title='Test Questionnaire',
        )

    def test_create_position(self):
        url = f'/api/projects/{self.project.id}/questionnaire/positions/'
        data = {'name': '디자이너', 'order': 0}
        response = self.client.post(url, data, format='json')
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)

    def test_list_positions(self):
        PositionCategory.objects.create(
            questionnaire=self.questionnaire, name='Dev', order=0,
        )
        url = f'/api/projects/{self.project.id}/questionnaire/positions/'
        response = self.client.get(url)
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(response.data), 1)

    def test_delete_position(self):
        pc = PositionCategory.objects.create(
            questionnaire=self.questionnaire, name='Dev', order=0,
        )
        url = f'/api/projects/{self.project.id}/questionnaire/positions/{pc.id}/'
        response = self.client.delete(url)
        self.assertEqual(response.status_code, status.HTTP_204_NO_CONTENT)
