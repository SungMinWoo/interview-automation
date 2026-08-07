import pytest
from django.contrib.auth import get_user_model
from django.urls import reverse
from rest_framework import status
from rest_framework.test import APIClient

User = get_user_model()


@pytest.fixture
def api_client():
    return APIClient()


@pytest.fixture
def user_data():
    return {
        'email': 'test@example.com',
        'username': 'testuser',
        'password': 'StrongPass123!',
        'password_confirm': 'StrongPass123!',
    }


@pytest.fixture
def create_user():
    def _create_user(**kwargs):
        defaults = {
            'username': 'testuser',
            'email': 'test@example.com',
            'password': 'StrongPass123!',
        }
        defaults.update(kwargs)
        return User.objects.create_user(**defaults)
    return _create_user


@pytest.mark.django_db
class TestLogoutView:
    url = reverse('accounts:logout')

    def test_logout_success(self, api_client, create_user):
        user = create_user()
        from rest_framework_simplejwt.tokens import RefreshToken
        refresh = RefreshToken.for_user(user)
        api_client.credentials(
            HTTP_AUTHORIZATION=f'Bearer {refresh.access_token}'
        )
        response = api_client.post(
            self.url, {'refresh': str(refresh)}, format='json'
        )
        assert response.status_code == status.HTTP_205_RESET_CONTENT

    def test_logout_without_token(self, api_client, create_user):
        user = create_user()
        from rest_framework_simplejwt.tokens import RefreshToken
        refresh = RefreshToken.for_user(user)
        api_client.credentials(
            HTTP_AUTHORIZATION=f'Bearer {refresh.access_token}'
        )
        response = api_client.post(self.url, {}, format='json')
        assert response.status_code == status.HTTP_400_BAD_REQUEST

    def test_logout_unauthenticated(self, api_client):
        response = api_client.post(self.url, {}, format='json')
        assert response.status_code == status.HTTP_401_UNAUTHORIZED


@pytest.mark.django_db
class TestMeView:
    url = reverse('accounts:me')

    def _authenticate(self, api_client, user):
        from rest_framework_simplejwt.tokens import RefreshToken
        refresh = RefreshToken.for_user(user)
        api_client.credentials(
            HTTP_AUTHORIZATION=f'Bearer {refresh.access_token}'
        )

    def test_get_profile(self, api_client, create_user):
        user = create_user()
        self._authenticate(api_client, user)
        response = api_client.get(self.url)
        assert response.status_code == status.HTTP_200_OK
        assert response.data['email'] == user.email
        assert response.data['username'] == user.username

    def test_update_profile(self, api_client, create_user):
        user = create_user()
        self._authenticate(api_client, user)
        response = api_client.patch(
            self.url, {'company_name': 'New Corp'}, format='json'
        )
        assert response.status_code == status.HTTP_200_OK
        user.refresh_from_db()
        assert user.company_name == 'New Corp'

    def test_unauthenticated_access(self, api_client):
        response = api_client.get(self.url)
        assert response.status_code == status.HTTP_401_UNAUTHORIZED


@pytest.mark.django_db
class TestTokenRefreshView:
    url = reverse('accounts:token-refresh')

    def test_refresh_token(self, api_client, create_user):
        user = create_user()
        from rest_framework_simplejwt.tokens import RefreshToken
        refresh = RefreshToken.for_user(user)
        response = api_client.post(
            self.url, {'refresh': str(refresh)}, format='json'
        )
        assert response.status_code == status.HTTP_200_OK
        assert 'access' in response.data

    def test_invalid_refresh_token(self, api_client):
        response = api_client.post(
            self.url, {'refresh': 'invalidtoken'}, format='json'
        )
        assert response.status_code == status.HTTP_401_UNAUTHORIZED
