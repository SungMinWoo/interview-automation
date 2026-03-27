from django.test import TestCase
from django.contrib.auth import get_user_model

from apps.projects.models import Project
from apps.questionnaires.models import Questionnaire, Question
from apps.aggregation.models import Aggregation, ExtractedKeyword, ExtractedSentence

User = get_user_model()


class AggregationModelTest(TestCase):
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

    def test_create_aggregation(self):
        agg = Aggregation.objects.create(
            project=self.project,
            version=1,
        )
        self.assertEqual(agg.status, Aggregation.Status.PENDING)
        self.assertEqual(agg.version, 1)
        self.assertIn('v1', str(agg))

    def test_ordering_by_version_desc(self):
        Aggregation.objects.create(project=self.project, version=1)
        Aggregation.objects.create(project=self.project, version=2)
        aggregations = list(self.project.aggregations.all())
        self.assertEqual(aggregations[0].version, 2)
        self.assertEqual(aggregations[1].version, 1)

    def test_default_json_fields(self):
        agg = Aggregation.objects.create(project=self.project, version=1)
        self.assertEqual(agg.raw_ai_response, {})
        self.assertEqual(agg.desired_changes, [])
        self.assertEqual(agg.company_values, [])


class ExtractedKeywordModelTest(TestCase):
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
        self.aggregation = Aggregation.objects.create(
            project=self.project, version=1,
        )

    def test_create_keyword(self):
        kw = ExtractedKeyword.objects.create(
            aggregation=self.aggregation,
            text='innovation',
            category='theme',
            weight=2.5,
        )
        self.assertEqual(str(kw), 'innovation')
        self.assertEqual(kw.weight, 2.5)

    def test_ordering(self):
        ExtractedKeyword.objects.create(
            aggregation=self.aggregation, text='B', order=2,
        )
        ExtractedKeyword.objects.create(
            aggregation=self.aggregation, text='A', order=1,
        )
        keywords = list(self.aggregation.keywords.all())
        self.assertEqual(keywords[0].text, 'A')
        self.assertEqual(keywords[1].text, 'B')


class ExtractedSentenceModelTest(TestCase):
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
        self.aggregation = Aggregation.objects.create(
            project=self.project, version=1,
        )

    def test_create_sentence(self):
        s = ExtractedSentence.objects.create(
            aggregation=self.aggregation,
            text='We need a modern design approach.',
            category='design',
        )
        self.assertIn('modern design', str(s))

    def test_sentence_with_source_question(self):
        questionnaire = Questionnaire.objects.create(
            project=self.project, title='Q',
        )
        question = Question.objects.create(
            questionnaire=questionnaire, text='What style?',
        )
        s = ExtractedSentence.objects.create(
            aggregation=self.aggregation,
            text='Minimalist style preferred.',
            source_question=question,
        )
        self.assertEqual(s.source_question, question)

    def test_ordering(self):
        ExtractedSentence.objects.create(
            aggregation=self.aggregation, text='Second', order=2,
        )
        ExtractedSentence.objects.create(
            aggregation=self.aggregation, text='First', order=1,
        )
        sentences = list(self.aggregation.sentences.all())
        self.assertEqual(sentences[0].text, 'First')
        self.assertEqual(sentences[1].text, 'Second')
