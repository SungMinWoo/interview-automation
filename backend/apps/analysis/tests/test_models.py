from django.test import TestCase
from django.contrib.auth import get_user_model

from apps.projects.models import Project, ReferenceSite
from apps.analysis.models import SiteAnalysis, ProjectAnalysis

User = get_user_model()


class SiteAnalysisModelTest(TestCase):
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

    def test_create_site_analysis(self):
        sa = SiteAnalysis.objects.create(
            project=self.project,
            url='https://example.com',
            is_existing_site=True,
        )
        self.assertEqual(sa.project, self.project)
        self.assertTrue(sa.is_existing_site)
        self.assertEqual(str(sa), f"SiteAnalysis(https://example.com)")

    def test_site_analysis_with_reference(self):
        ref = ReferenceSite.objects.create(
            project=self.project,
            url='https://ref.com',
        )
        sa = SiteAnalysis.objects.create(
            project=self.project,
            reference_site=ref,
            url='https://ref.com',
        )
        self.assertEqual(sa.reference_site, ref)


class ProjectAnalysisModelTest(TestCase):
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

    def test_create_project_analysis(self):
        pa = ProjectAnalysis.objects.create(project=self.project)
        self.assertEqual(pa.status, ProjectAnalysis.Status.PENDING)
        self.assertIsNone(pa.confirmed_at)

    def test_status_choices(self):
        self.assertEqual(ProjectAnalysis.Status.PENDING, 'pending')
        self.assertEqual(ProjectAnalysis.Status.CONFIRMED, 'confirmed')

    def test_one_to_one_relationship(self):
        ProjectAnalysis.objects.create(project=self.project)
        self.assertIsNotNone(self.project.analysis)
