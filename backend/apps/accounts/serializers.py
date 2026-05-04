from django.contrib.auth import get_user_model
from django.contrib.auth.password_validation import validate_password
from rest_framework import serializers

User = get_user_model()


class RegisterSerializer(serializers.ModelSerializer):
    password = serializers.CharField(
        write_only=True, required=True, validators=[validate_password]
    )
    password_confirm = serializers.CharField(write_only=True, required=True)

    class Meta:
        model = User
        fields = [
            'id', 'email', 'username', 'password',
            'password_confirm', 'company_name',
        ]
        extra_kwargs = {
            'email': {'required': True},
            'username': {'required': True},
        }

    def validate(self, attrs):
        if attrs['password'] != attrs['password_confirm']:
            raise serializers.ValidationError(
                {'password_confirm': 'Passwords do not match.'}
            )
        return attrs

    def create(self, validated_data):
        validated_data.pop('password_confirm')
        password = validated_data.pop('password')
        user = User(**validated_data)
        user.set_password(password)
        user.save()
        return user


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
            'id', 'email', 'username', 'first_name', 'company_name',
            'is_active', 'is_staff', 'is_superuser',
            'last_login', 'created_at', 'updated_at',
        ]
        read_only_fields = [
            'id', 'email', 'username', 'first_name', 'company_name',
            'last_login', 'created_at', 'updated_at',
        ]
