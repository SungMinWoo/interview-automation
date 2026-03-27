from django.test import TestCase
from django.contrib.auth import get_user_model
from rest_framework.test import APIClient
from rest_framework import status

from apps.projects.models import Project, ReferenceSite

User = get_user_model()


class ProjectViewSetTest(TestCase):
    def setUp(self):
        self.client = APIClient()
        self.user = User.objects.create_user(
            email='test@example.com',
            password='testpass123',
        )
        self.other_user = User.objects.create_user(
            email='other@example.com',
            password='testpass123',
        )
        self.client.force_authenticate(user=self.user)

        self.project = Project.objects.create(
            owner=self.user,
            title='My Project',
            client_name='My Client',
            requirements_text='Build something.',
        )
        self.other_project = Project.objects.create(
            owner=self.other_user,
            title='Other Project',
            client_name='Other Client',
            requirements_text='Build something else.',
        )

    def test_list_projects_filtered_by_owner(self):
        response = self.client.get('/api/v1/projects/')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(response.data), 1)
        self.assertEqual(response.data[0]['title'], 'My Project')

    def test_create_project(self):
        data = {
            'title': 'New Project',
            'client_name': 'New Client',
            'requirements_text': 'New requirements.',
        }
        response = self.client.post('/api/v1/projects/', data, format='json')
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        project = Project.objects.get(pk=response.data['id'])
        self.assertEqual(project.owner, self.user)
        self.assertEqual(project.title, 'New Project')

    def test_create_project_with_reference_sites(self):
        data = {
            'title': 'New Project',
            'client_name': 'New Client',
            'requirements_text': 'New requirements.',
            'reference_sites': [
                {'url': 'https://example.com', 'title': 'Example'},
                {'url': 'https://test.com'},
            ],
        }
        response = self.client.post('/api/v1/projects/', data, format='json')
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        project = Project.objects.get(pk=response.data['id'])
        self.assertEqual(project.reference_sites.count(), 2)

    def test_retrieve_project(self):
        response = self.client.get(f'/api/v1/projects/{self.project.pk}/')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data['title'], 'My Project')
        self.assertIn('reference_sites', response.data)

    def test_cannot_retrieve_other_users_project(self):
        response = self.client.get(f'/api/v1/projects/{self.other_project.pk}/')
        self.assertEqual(response.status_code, status.HTTP_404_NOT_FOUND)

    def test_update_project(self):
        data = {'title': 'Updated Title'}
        response = self.client.patch(
            f'/api/v1/projects/{self.project.pk}/', data, format='json',
        )
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.project.refresh_from_db()
        self.assertEqual(self.project.title, 'Updated Title')

    def test_delete_project(self):
        response = self.client.delete(f'/api/v1/projects/{self.project.pk}/')
        self.assertEqual(response.status_code, status.HTTP_204_NO_CONTENT)
        self.assertFalse(Project.objects.filter(pk=self.project.pk).exists())

    def test_unauthenticated_access(self):
        self.client.force_authenticate(user=None)
        response = self.client.get('/api/v1/projects/')
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)


class ReferenceSiteViewSetTest(TestCase):
    def setUp(self):
        self.client = APIClient()
        self.user = User.objects.create_user(
            email='test@example.com',
            password='testpass123',
        )
        self.client.force_authenticate(user=self.user)

        self.project = Project.objects.create(
            owner=self.user,
            title='My Project',
            client_name='My Client',
            requirements_text='Build something.',
        )
        self.site = ReferenceSite.objects.create(
            project=self.project,
            url='https://example.com',
            title='Example',
        )

    def test_list_reference_sites(self):
        response = self.client.get(
            f'/api/v1/projects/{self.project.pk}/reference-sites/',
        )
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(response.data), 1)

    def test_create_reference_site(self):
        data = {'url': 'https://new-site.com', 'title': 'New Site'}
        response = self.client.post(
            f'/api/v1/projects/{self.project.pk}/reference-sites/',
            data,
            format='json',
        )
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertEqual(self.project.reference_sites.count(), 2)

    def test_delete_reference_site(self):
        response = self.client.delete(
            f'/api/v1/projects/{self.project.pk}/reference-sites/{self.site.pk}/',
        )
        self.assertEqual(response.status_code, status.HTTP_204_NO_CONTENT)
        self.assertEqual(self.project.reference_sites.count(), 0)

    def test_cannot_access_other_users_project_sites(self):
        other_user = User.objects.create_user(
            email='other@example.com',
            password='testpass123',
        )
        other_project = Project.objects.create(
            owner=other_user,
            title='Other Project',
            client_name='Other Client',
            requirements_text='Other requirements.',
        )
        ReferenceSite.objects.create(
            project=other_project,
            url='https://secret.com',
        )
        response = self.client.get(
            f'/api/v1/projects/{other_project.pk}/reference-sites/',
        )
        self.assertEqual(len(response.data), 0)
