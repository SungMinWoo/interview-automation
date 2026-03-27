from django.test import TestCase
from django.contrib.auth import get_user_model
from rest_framework.test import APIClient
from rest_framework import status

from apps.projects.models import Project
from apps.aggregation.models import Aggregation, ExtractedKeyword, ExtractedSentence

User = get_user_model()


class AggregationViewTestBase(TestCase):
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


class TriggerAggregationViewTest(AggregationViewTestBase):
    def test_trigger_creates_aggregation(self):
        url = f'/api/projects/{self.project.id}/aggregation/trigger/'
        response = self.client.post(url)
        self.assertEqual(response.status_code, status.HTTP_202_ACCEPTED)
        self.assertTrue(Aggregation.objects.filter(project=self.project).exists())
        self.assertEqual(response.data['version'], 1)

    def test_trigger_increments_version(self):
        Aggregation.objects.create(project=self.project, version=1)
        url = f'/api/projects/{self.project.id}/aggregation/trigger/'
        response = self.client.post(url)
        self.assertEqual(response.status_code, status.HTTP_202_ACCEPTED)
        self.assertEqual(response.data['version'], 2)

    def test_trigger_requires_auth(self):
        self.client.force_authenticate(user=None)
        url = f'/api/projects/{self.project.id}/aggregation/trigger/'
        response = self.client.post(url)
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)

    def test_trigger_rejects_other_user(self):
        other = User.objects.create_user(
            username='other', email='o@o.com', password='testpass123',
        )
        self.client.force_authenticate(user=other)
        url = f'/api/projects/{self.project.id}/aggregation/trigger/'
        response = self.client.post(url)
        self.assertEqual(response.status_code, status.HTTP_404_NOT_FOUND)


class AggregationDetailViewTest(AggregationViewTestBase):
    def test_get_latest_aggregation(self):
        agg = Aggregation.objects.create(
            project=self.project, version=1,
            status=Aggregation.Status.COMPLETED,
            summary='Test summary',
        )
        ExtractedKeyword.objects.create(aggregation=agg, text='keyword1', order=0)
        ExtractedSentence.objects.create(aggregation=agg, text='sentence1', order=0)

        url = f'/api/projects/{self.project.id}/aggregation/'
        response = self.client.get(url)
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data['summary'], 'Test summary')
        self.assertEqual(len(response.data['keywords']), 1)
        self.assertEqual(len(response.data['sentences']), 1)

    def test_get_returns_404_when_none(self):
        url = f'/api/projects/{self.project.id}/aggregation/'
        response = self.client.get(url)
        self.assertEqual(response.status_code, status.HTTP_404_NOT_FOUND)


class AggregationStatusViewTest(AggregationViewTestBase):
    def test_get_status(self):
        Aggregation.objects.create(
            project=self.project, version=1,
            status=Aggregation.Status.PROCESSING,
        )
        url = f'/api/projects/{self.project.id}/aggregation/status/'
        response = self.client.get(url)
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data['status'], 'processing')

    def test_status_returns_404_when_none(self):
        url = f'/api/projects/{self.project.id}/aggregation/status/'
        response = self.client.get(url)
        self.assertEqual(response.status_code, status.HTTP_404_NOT_FOUND)


class RegenerateAggregationViewTest(AggregationViewTestBase):
    def test_regenerate_creates_new_version(self):
        Aggregation.objects.create(project=self.project, version=1)
        url = f'/api/projects/{self.project.id}/aggregation/regenerate/'
        response = self.client.post(url)
        self.assertEqual(response.status_code, status.HTTP_202_ACCEPTED)
        self.assertEqual(response.data['version'], 2)
        self.assertEqual(Aggregation.objects.filter(project=self.project).count(), 2)


class KeywordViewSetTest(AggregationViewTestBase):
    def setUp(self):
        super().setUp()
        self.aggregation = Aggregation.objects.create(
            project=self.project, version=1,
            status=Aggregation.Status.COMPLETED,
        )

    def test_list_keywords(self):
        ExtractedKeyword.objects.create(
            aggregation=self.aggregation, text='kw1', order=0,
        )
        url = f'/api/projects/{self.project.id}/aggregation/keywords/'
        response = self.client.get(url)
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(response.data), 1)

    def test_create_keyword(self):
        url = f'/api/projects/{self.project.id}/aggregation/keywords/'
        data = {'text': 'new keyword', 'category': 'theme', 'weight': 1.5}
        response = self.client.post(url, data, format='json')
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertEqual(response.data['text'], 'new keyword')

    def test_update_keyword(self):
        kw = ExtractedKeyword.objects.create(
            aggregation=self.aggregation, text='kw1', order=0,
        )
        url = f'/api/projects/{self.project.id}/aggregation/keywords/{kw.id}/'
        response = self.client.patch(url, {'text': 'updated'}, format='json')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data['text'], 'updated')

    def test_delete_keyword(self):
        kw = ExtractedKeyword.objects.create(
            aggregation=self.aggregation, text='kw1', order=0,
        )
        url = f'/api/projects/{self.project.id}/aggregation/keywords/{kw.id}/'
        response = self.client.delete(url)
        self.assertEqual(response.status_code, status.HTTP_204_NO_CONTENT)
        self.assertFalse(ExtractedKeyword.objects.filter(id=kw.id).exists())


class SentenceViewSetTest(AggregationViewTestBase):
    def setUp(self):
        super().setUp()
        self.aggregation = Aggregation.objects.create(
            project=self.project, version=1,
            status=Aggregation.Status.COMPLETED,
        )

    def test_list_sentences(self):
        ExtractedSentence.objects.create(
            aggregation=self.aggregation, text='sentence1', order=0,
        )
        url = f'/api/projects/{self.project.id}/aggregation/sentences/'
        response = self.client.get(url)
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(response.data), 1)

    def test_create_sentence(self):
        url = f'/api/projects/{self.project.id}/aggregation/sentences/'
        data = {'text': 'new sentence', 'category': 'design'}
        response = self.client.post(url, data, format='json')
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertEqual(response.data['text'], 'new sentence')

    def test_delete_sentence(self):
        s = ExtractedSentence.objects.create(
            aggregation=self.aggregation, text='s1', order=0,
        )
        url = f'/api/projects/{self.project.id}/aggregation/sentences/{s.id}/'
        response = self.client.delete(url)
        self.assertEqual(response.status_code, status.HTTP_204_NO_CONTENT)
        self.assertFalse(ExtractedSentence.objects.filter(id=s.id).exists())
