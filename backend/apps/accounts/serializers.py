from django.contrib.auth import get_user_model
from rest_framework import serializers

User = get_user_model()


class LoginResponseSerializer(serializers.ModelSerializer):
    """Read-only serializer returned after successful login."""

    class Meta:
        model = User
        fields = [
            'id', 'email', 'username', 'first_name', 'company_name', 'sso_id',
            'is_active', 'is_staff', 'is_superuser',
        ]
        read_only_fields = fields


class UserProfileSerializer(serializers.ModelSerializer):
    class Meta:
        model = User
        fields = [
            'id', 'email', 'username', 'first_name', 'company_name',
            'is_active', 'is_staff', 'is_superuser',
            'created_at', 'updated_at',
        ]
        read_only_fields = [
            'id', 'email', 'is_active', 'is_staff', 'is_superuser',
            'created_at', 'updated_at',
        ]


class UserSearchSerializer(serializers.ModelSerializer):
    """유저 검색 결과용 — 멤버 추가 시 사용."""
    class Meta:
        model = User
        fields = ['id', 'email', 'username', 'first_name', 'company_name']
        read_only_fields = fields


class AdminUserSerializer(serializers.ModelSerializer):
    """사이트 관리자(is_superuser/is_staff)가 유저를 관리할 때 사용."""
    last_login = serializers.DateTimeField(read_only=True)

    class Meta:
        model = User
        fields = [
            'id', 'email', 'username', 'first_name',
            'is_active', 'is_staff', 'is_superuser',
            'last_login', 'created_at', 'updated_at',
        ]
        read_only_fields = [
            'id', 'email', 'username', 'first_name',
            'last_login', 'created_at', 'updated_at',
        ]
