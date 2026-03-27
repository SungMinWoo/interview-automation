import pytest
from django.contrib.auth import get_user_model

User = get_user_model()


@pytest.mark.django_db
class TestUserModel:
    def test_create_user(self):
        user = User.objects.create_user(
            username='testuser',
            email='test@example.com',
            password='testpass123',
        )
        assert user.email == 'test@example.com'
        assert user.username == 'testuser'
        assert user.check_password('testpass123')
        assert not user.is_staff
        assert not user.is_superuser

    def test_create_superuser(self):
        user = User.objects.create_superuser(
            username='admin',
            email='admin@example.com',
            password='adminpass123',
        )
        assert user.is_staff
        assert user.is_superuser

    def test_email_is_unique(self):
        User.objects.create_user(
            username='user1',
            email='dup@example.com',
            password='pass123',
        )
        with pytest.raises(Exception):
            User.objects.create_user(
                username='user2',
                email='dup@example.com',
                password='pass456',
            )

    def test_str_returns_email(self):
        user = User.objects.create_user(
            username='testuser',
            email='test@example.com',
            password='testpass123',
        )
        assert str(user) == 'test@example.com'

    def test_company_name_blank_by_default(self):
        user = User.objects.create_user(
            username='testuser',
            email='test@example.com',
            password='testpass123',
        )
        assert user.company_name == ''

    def test_company_name_can_be_set(self):
        user = User.objects.create_user(
            username='testuser',
            email='test@example.com',
            password='testpass123',
            company_name='Acme Corp',
        )
        assert user.company_name == 'Acme Corp'

    def test_timestamps_are_set(self):
        user = User.objects.create_user(
            username='testuser',
            email='test@example.com',
            password='testpass123',
        )
        assert user.created_at is not None
        assert user.updated_at is not None

    def test_username_field_is_email(self):
        assert User.USERNAME_FIELD == 'email'

    def test_required_fields_include_username(self):
        assert 'username' in User.REQUIRED_FIELDS
