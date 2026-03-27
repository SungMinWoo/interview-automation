from django.test import TestCase
from django.contrib.auth import get_user_model

from apps.projects.models import Project, ReferenceSite

User = get_user_model()


class ProjectModelTest(TestCase):
    def setUp(self):
        self.user = User.objects.create_user(
            email='test@example.com',
            password='testpass123',
        )
        self.project = Project.objects.create(
            owner=self.user,
            title='Test Project',
            client_name='Test Client',
            requirements_text='Build a website.',
        )

    def test_str(self):
        self.assertEqual(str(self.project), 'Test Project - Test Client')

    def test_default_status(self):
        self.assertEqual(self.project.status, Project.Status.CREATED)

    def test_ordering(self):
        project2 = Project.objects.create(
            owner=self.user,
            title='Second Project',
            client_name='Client 2',
            requirements_text='Another website.',
        )
        projects = list(Project.objects.all())
        self.assertEqual(projects[0], project2)
        self.assertEqual(projects[1], self.project)

    def test_owner_relationship(self):
        self.assertIn(self.project, self.user.projects.all())


class ReferenceSiteModelTest(TestCase):
    def setUp(self):
        self.user = User.objects.create_user(
            email='test@example.com',
            password='testpass123',
        )
        self.project = Project.objects.create(
            owner=self.user,
            title='Test Project',
            client_name='Test Client',
            requirements_text='Build a website.',
        )

    def test_str_with_title(self):
        site = ReferenceSite.objects.create(
            project=self.project,
            url='https://example.com',
            title='Example Site',
        )
        self.assertEqual(str(site), 'Example Site')

    def test_str_without_title(self):
        site = ReferenceSite.objects.create(
            project=self.project,
            url='https://example.com',
        )
        self.assertEqual(str(site), 'https://example.com')

    def test_default_crawl_data(self):
        site = ReferenceSite.objects.create(
            project=self.project,
            url='https://example.com',
        )
        self.assertEqual(site.crawl_data, {})

    def test_ordering(self):
        site1 = ReferenceSite.objects.create(
            project=self.project, url='https://a.com', order=1,
        )
        site2 = ReferenceSite.objects.create(
            project=self.project, url='https://b.com', order=0,
        )
        sites = list(self.project.reference_sites.all())
        self.assertEqual(sites[0], site2)
        self.assertEqual(sites[1], site1)

    def test_cascade_delete(self):
        ReferenceSite.objects.create(
            project=self.project, url='https://example.com',
        )
        self.project.delete()
        self.assertEqual(ReferenceSite.objects.count(), 0)
