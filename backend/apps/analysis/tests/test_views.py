from django.test import TestCase
from django.urls import reverse
from django.contrib.auth import get_user_model
from rest_framework.test import APIClient
from rest_framework import status

from apps.projects.models import Project
from apps.analysis.models import ProjectAnalysis

User = get_user_model()


class AnalysisViewTestBase(TestCase):
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


class TriggerAnalysisViewTest(AnalysisViewTestBase):
    def test_trigger_creates_analysis(self):
        url = f'/api/projects/{self.project.id}/analysis/trigger/'
        response = self.client.post(url)
        self.assertEqual(response.status_code, status.HTTP_202_ACCEPTED)
        self.assertTrue(ProjectAnalysis.objects.filter(project=self.project).exists())
        analysis = ProjectAnalysis.objects.get(project=self.project)
        self.assertEqual(analysis.status, ProjectAnalysis.Status.COMPLETED)  # sync stub

    def test_trigger_rejects_confirmed(self):
        ProjectAnalysis.objects.create(
            project=self.project,
            status=ProjectAnalysis.Status.CONFIRMED,
        )
        url = f'/api/projects/{self.project.id}/analysis/trigger/'
        response = self.client.post(url)
        self.assertEqual(response.status_code, status.HTTP_409_CONFLICT)

    def test_trigger_requires_auth(self):
        self.client.force_authenticate(user=None)
        url = f'/api/projects/{self.project.id}/analysis/trigger/'
        response = self.client.post(url)
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)

    def test_trigger_rejects_other_user_project(self):
        other_user = User.objects.create_user(
            username='other', email='o@o.com', password='testpass123',
        )
        self.client.force_authenticate(user=other_user)
        url = f'/api/projects/{self.project.id}/analysis/trigger/'
        response = self.client.post(url)
        self.assertEqual(response.status_code, status.HTTP_404_NOT_FOUND)


class AnalysisDetailViewTest(AnalysisViewTestBase):
    def test_get_analysis(self):
        ProjectAnalysis.objects.create(
            project=self.project,
            status=ProjectAnalysis.Status.COMPLETED,
        )
        url = f'/api/projects/{self.project.id}/analysis/'
        response = self.client.get(url)
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data['status'], 'completed')


class AnalysisUpdateViewTest(AnalysisViewTestBase):
    def test_patch_user_edits(self):
        ProjectAnalysis.objects.create(
            project=self.project,
            status=ProjectAnalysis.Status.COMPLETED,
        )
        url = f'/api/projects/{self.project.id}/analysis/'
        response = self.client.patch(url, {'user_edits': {'note': 'fix'}}, format='json')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data['user_edits'], {'note': 'fix'})


class AnalysisConfirmViewTest(AnalysisViewTestBase):
    def test_confirm_completed_analysis(self):
        ProjectAnalysis.objects.create(
            project=self.project,
            status=ProjectAnalysis.Status.COMPLETED,
        )
        url = f'/api/projects/{self.project.id}/analysis/confirm/'
        response = self.client.post(url)
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data['status'], 'confirmed')

    def test_confirm_pending_fails(self):
        ProjectAnalysis.objects.create(
            project=self.project,
            status=ProjectAnalysis.Status.PENDING,
        )
        url = f'/api/projects/{self.project.id}/analysis/confirm/'
        response = self.client.post(url)
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)


class AnalysisStatusViewTest(AnalysisViewTestBase):
    def test_get_status(self):
        ProjectAnalysis.objects.create(
            project=self.project,
            status=ProjectAnalysis.Status.PROCESSING,
        )
        url = f'/api/projects/{self.project.id}/analysis/status/'
        response = self.client.get(url)
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data['status'], 'processing')
