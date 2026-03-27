from django.test import TestCase
from django.contrib.auth import get_user_model
from rest_framework.test import APIClient
from rest_framework import status

from apps.projects.models import Project
from apps.aggregation.models import Aggregation, ExtractedKeyword, ExtractedSentence
from apps.design_brief.models import DesignBrief, StitchGeneration

User = get_user_model()


class DesignBriefViewTestBase(TestCase):
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


class CompileDesignBriefViewTest(DesignBriefViewTestBase):
    def test_compile_creates_brief(self):
        agg = Aggregation.objects.create(
            project=self.project, version=1,
            status=Aggregation.Status.COMPLETED,
            summary='Summary text',
            company_direction='Direction text',
        )
        ExtractedKeyword.objects.create(aggregation=agg, text='kw1', order=0)
        ExtractedSentence.objects.create(aggregation=agg, text='s1', order=0)

        url = f'/api/projects/{self.project.id}/design-brief/compile/'
        response = self.client.post(url)
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertEqual(response.data['summary'], 'Summary text')
        self.assertEqual(len(response.data['selected_keywords']), 1)
        self.assertEqual(len(response.data['selected_sentences']), 1)

    def test_compile_updates_existing_brief(self):
        agg = Aggregation.objects.create(
            project=self.project, version=1,
            status=Aggregation.Status.COMPLETED,
            summary='Old summary',
        )
        DesignBrief.objects.create(
            project=self.project, aggregation=agg, title='Old',
        )
        agg2 = Aggregation.objects.create(
            project=self.project, version=2,
            status=Aggregation.Status.COMPLETED,
            summary='New summary',
        )

        url = f'/api/projects/{self.project.id}/design-brief/compile/'
        response = self.client.post(url)
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data['summary'], 'New summary')

    def test_compile_requires_aggregation(self):
        url = f'/api/projects/{self.project.id}/design-brief/compile/'
        response = self.client.post(url)
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

    def test_compile_requires_auth(self):
        self.client.force_authenticate(user=None)
        url = f'/api/projects/{self.project.id}/design-brief/compile/'
        response = self.client.post(url)
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)

    def test_compile_rejects_other_user(self):
        other = User.objects.create_user(
            username='other', email='o@o.com', password='testpass123',
        )
        self.client.force_authenticate(user=other)
        url = f'/api/projects/{self.project.id}/design-brief/compile/'
        response = self.client.post(url)
        self.assertEqual(response.status_code, status.HTTP_404_NOT_FOUND)


class DesignBriefDetailViewTest(DesignBriefViewTestBase):
    def setUp(self):
        super().setUp()
        self.aggregation = Aggregation.objects.create(
            project=self.project, version=1,
        )
        self.brief = DesignBrief.objects.create(
            project=self.project,
            aggregation=self.aggregation,
            title='Test Brief',
            summary='Brief summary',
        )

    def test_get_brief(self):
        url = f'/api/projects/{self.project.id}/design-brief/'
        response = self.client.get(url)
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data['title'], 'Test Brief')

    def test_patch_brief(self):
        url = f'/api/projects/{self.project.id}/design-brief/'
        response = self.client.patch(
            url, {'title': 'Updated Brief'}, format='json',
        )
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data['title'], 'Updated Brief')

    def test_get_returns_404_when_no_brief(self):
        self.brief.delete()
        url = f'/api/projects/{self.project.id}/design-brief/'
        response = self.client.get(url)
        self.assertEqual(response.status_code, status.HTTP_404_NOT_FOUND)


class TriggerStitchViewTest(DesignBriefViewTestBase):
    def setUp(self):
        super().setUp()
        self.aggregation = Aggregation.objects.create(
            project=self.project, version=1,
        )
        self.brief = DesignBrief.objects.create(
            project=self.project,
            aggregation=self.aggregation,
            title='Test Brief',
        )

    def test_trigger_stitch(self):
        url = f'/api/projects/{self.project.id}/design-brief/stitch/generate/'
        data = {'prompt_text': 'Create a modern page'}
        response = self.client.post(url, data, format='json')
        self.assertEqual(response.status_code, status.HTTP_202_ACCEPTED)
        self.assertEqual(response.data['version'], 1)
        self.assertEqual(response.data['prompt_text'], 'Create a modern page')

    def test_trigger_stitch_increments_version(self):
        StitchGeneration.objects.create(
            design_brief=self.brief, prompt_text='v1', version=1,
        )
        url = f'/api/projects/{self.project.id}/design-brief/stitch/generate/'
        data = {'prompt_text': 'v2 prompt'}
        response = self.client.post(url, data, format='json')
        self.assertEqual(response.status_code, status.HTTP_202_ACCEPTED)
        self.assertEqual(response.data['version'], 2)


class StitchListViewTest(DesignBriefViewTestBase):
    def setUp(self):
        super().setUp()
        self.aggregation = Aggregation.objects.create(
            project=self.project, version=1,
        )
        self.brief = DesignBrief.objects.create(
            project=self.project,
            aggregation=self.aggregation,
            title='Test Brief',
        )

    def test_list_stitch_generations(self):
        StitchGeneration.objects.create(
            design_brief=self.brief, prompt_text='p1', version=1,
        )
        StitchGeneration.objects.create(
            design_brief=self.brief, prompt_text='p2', version=2,
        )
        url = f'/api/projects/{self.project.id}/design-brief/stitch/'
        response = self.client.get(url)
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(response.data), 2)


class StitchDetailViewTest(DesignBriefViewTestBase):
    def setUp(self):
        super().setUp()
        self.aggregation = Aggregation.objects.create(
            project=self.project, version=1,
        )
        self.brief = DesignBrief.objects.create(
            project=self.project,
            aggregation=self.aggregation,
            title='Test Brief',
        )
        self.generation = StitchGeneration.objects.create(
            design_brief=self.brief, prompt_text='test', version=1,
        )

    def test_get_stitch_detail(self):
        url = f'/api/projects/{self.project.id}/design-brief/stitch/{self.generation.id}/'
        response = self.client.get(url)
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data['version'], 1)

    def test_get_stitch_detail_404(self):
        url = f'/api/projects/{self.project.id}/design-brief/stitch/9999/'
        response = self.client.get(url)
        self.assertEqual(response.status_code, status.HTTP_404_NOT_FOUND)


class StitchRegenerateViewTest(DesignBriefViewTestBase):
    def setUp(self):
        super().setUp()
        self.aggregation = Aggregation.objects.create(
            project=self.project, version=1,
        )
        self.brief = DesignBrief.objects.create(
            project=self.project,
            aggregation=self.aggregation,
            title='Test Brief',
        )
        self.generation = StitchGeneration.objects.create(
            design_brief=self.brief, prompt_text='original', version=1,
        )

    def test_regenerate_creates_new_version(self):
        url = f'/api/projects/{self.project.id}/design-brief/stitch/{self.generation.id}/regenerate/'
        data = {'prompt_text': 'modified prompt'}
        response = self.client.post(url, data, format='json')
        self.assertEqual(response.status_code, status.HTTP_202_ACCEPTED)
        self.assertEqual(response.data['version'], 2)
        self.assertEqual(response.data['prompt_text'], 'modified prompt')

    def test_regenerate_uses_original_prompt_if_not_provided(self):
        url = f'/api/projects/{self.project.id}/design-brief/stitch/{self.generation.id}/regenerate/'
        response = self.client.post(url, {}, format='json')
        self.assertEqual(response.status_code, status.HTTP_202_ACCEPTED)
        self.assertEqual(response.data['prompt_text'], 'original')


class ExportBriefViewTest(DesignBriefViewTestBase):
    def setUp(self):
        super().setUp()
        self.aggregation = Aggregation.objects.create(
            project=self.project, version=1,
        )
        self.brief = DesignBrief.objects.create(
            project=self.project,
            aggregation=self.aggregation,
            title='Export Brief',
            summary='Export summary',
        )

    def test_export_brief(self):
        url = f'/api/projects/{self.project.id}/design-brief/export/'
        response = self.client.get(url)
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data['title'], 'Export Brief')
        self.assertEqual(response.data['summary'], 'Export summary')
        self.assertNotIn('id', response.data)
        self.assertNotIn('project', response.data)
