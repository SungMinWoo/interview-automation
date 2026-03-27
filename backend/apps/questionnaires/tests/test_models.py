from django.test import TestCase
from django.contrib.auth import get_user_model

from apps.projects.models import Project
from apps.questionnaires.models import Questionnaire, PositionCategory, Question

User = get_user_model()


class QuestionnaireModelTest(TestCase):
    def setUp(self):
        self.user = User.objects.create_user(
            username='tester', email='t@t.com', password='testpass123',
        )
        self.project = Project.objects.create(
            owner=self.user,
            title='Test Project',
            client_name='Client',
            requirements_text='Build a website.',
        )

    def test_create_questionnaire(self):
        q = Questionnaire.objects.create(
            project=self.project,
            title='Test Questionnaire',
        )
        self.assertEqual(str(q), 'Test Questionnaire')
        self.assertEqual(q.project, self.project)

    def test_one_to_one_relationship(self):
        Questionnaire.objects.create(
            project=self.project,
            title='Test Questionnaire',
        )
        self.assertIsNotNone(self.project.questionnaire)


class PositionCategoryModelTest(TestCase):
    def setUp(self):
        self.user = User.objects.create_user(
            username='tester', email='t@t.com', password='testpass123',
        )
        self.project = Project.objects.create(
            owner=self.user,
            title='Test Project',
            client_name='Client',
            requirements_text='Build a website.',
        )
        self.questionnaire = Questionnaire.objects.create(
            project=self.project,
            title='Test Questionnaire',
        )

    def test_create_position_category(self):
        pc = PositionCategory.objects.create(
            questionnaire=self.questionnaire,
            name='디자이너',
            order=0,
        )
        self.assertEqual(str(pc), '디자이너')

    def test_ordering(self):
        PositionCategory.objects.create(questionnaire=self.questionnaire, name='B', order=2)
        PositionCategory.objects.create(questionnaire=self.questionnaire, name='A', order=1)
        categories = list(self.questionnaire.position_categories.all())
        self.assertEqual(categories[0].name, 'A')
        self.assertEqual(categories[1].name, 'B')


class QuestionModelTest(TestCase):
    def setUp(self):
        self.user = User.objects.create_user(
            username='tester', email='t@t.com', password='testpass123',
        )
        self.project = Project.objects.create(
            owner=self.user,
            title='Test Project',
            client_name='Client',
            requirements_text='Build a website.',
        )
        self.questionnaire = Questionnaire.objects.create(
            project=self.project,
            title='Test Questionnaire',
        )

    def test_create_question(self):
        q = Question.objects.create(
            questionnaire=self.questionnaire,
            text='What is the main goal?',
            question_type=Question.QuestionType.TEXTAREA,
        )
        self.assertEqual(q.question_type, 'textarea')
        self.assertTrue(q.is_required)

    def test_question_type_choices(self):
        self.assertEqual(Question.QuestionType.TEXT, 'text')
        self.assertEqual(Question.QuestionType.SINGLE_CHOICE, 'single_choice')
        self.assertEqual(Question.QuestionType.RANKING, 'ranking')

    def test_question_with_position_categories(self):
        pc = PositionCategory.objects.create(
            questionnaire=self.questionnaire, name='Dev', order=0,
        )
        q = Question.objects.create(
            questionnaire=self.questionnaire,
            text='Rate the design',
        )
        q.position_categories.add(pc)
        self.assertIn(pc, q.position_categories.all())

    def test_ordering(self):
        Question.objects.create(questionnaire=self.questionnaire, text='Q2', order=2)
        Question.objects.create(questionnaire=self.questionnaire, text='Q1', order=1)
        questions = list(self.questionnaire.questions.all())
        self.assertEqual(questions[0].text, 'Q1')
