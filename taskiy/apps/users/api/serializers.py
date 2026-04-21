"""
API serializers for User management.
"""

from rest_framework import serializers
from rest_framework_simplejwt.serializers import TokenObtainPairSerializer
from django.contrib.auth import authenticate
from django.utils import timezone

from apps.users.models import User, Role, UserRole


class UserRegistrationSerializer(serializers.ModelSerializer):
    """
    Serializer for user registration.
    """
    password = serializers.CharField(write_only=True, min_length=8)
    password_confirm = serializers.CharField(write_only=True)

    class Meta:
        model = User
        fields = [
            'email',
            'first_name',
            'last_name',
            'password',
            'password_confirm',
        ]

    def validate(self, data):
        """Validate password confirmation"""
        if data['password'] != data['password_confirm']:
            raise serializers.ValidationError("Passwords do not match.")
        return data

    def create(self, validated_data):
        """Create user with encrypted password"""
        validated_data.pop('password_confirm')
        user = User.objects.create_user(**validated_data)
        return user


class UserProfileSerializer(serializers.ModelSerializer):
    """
    Serializer for user profile information.
    """
    roles = serializers.SerializerMethodField()
    full_name = serializers.CharField(source='get_full_name', read_only=True)

    class Meta:
        model = User
        fields = [
            'id',
            'email',
            'first_name',
            'last_name',
            'full_name',
            'is_active',
            'date_joined',
            'last_login',
            'roles',
        ]
        read_only_fields = [
            'id',
            'date_joined',
            'last_login',
            'roles',
        ]

    def get_roles(self, obj):
        """Get user's roles"""
        return obj.get_role_names()


class UserListSerializer(serializers.ModelSerializer):
    """
    Serializer for user listing (compact view).
    """
    roles = serializers.SerializerMethodField()
    full_name = serializers.CharField(source='get_full_name', read_only=True)

    class Meta:
        model = User
        fields = [
            'id',
            'email',
            'full_name',
            'is_active',
            'date_joined',
            'roles',
        ]

    def get_roles(self, obj):
        """Get user's roles"""
        return obj.get_role_names()


class UserUpdateSerializer(serializers.ModelSerializer):
    """
    Serializer for updating user profile.
    """

    class Meta:
        model = User
        fields = [
            'first_name',
            'last_name',
        ]

    def validate_first_name(self, value):
        """Validate first name"""
        if not value.strip():
            raise serializers.ValidationError("First name cannot be empty.")
        return value.strip()

    def validate_last_name(self, value):
        """Validate last name"""
        if not value.strip():
            raise serializers.ValidationError("Last name cannot be empty.")
        return value.strip()


class ChangePasswordSerializer(serializers.Serializer):
    """
    Serializer for password change.
    """
    old_password = serializers.CharField(write_only=True)
    new_password = serializers.CharField(write_only=True, min_length=8)
    new_password_confirm = serializers.CharField(write_only=True)

    def validate_old_password(self, value):
        """Validate old password"""
        user = self.context['request'].user
        if not user.check_password(value):
            raise serializers.ValidationError("Old password is incorrect.")
        return value

    def validate(self, data):
        """Validate new passwords match"""
        if data['new_password'] != data['new_password_confirm']:
            raise serializers.ValidationError("New passwords do not match.")
        return data


class CustomTokenObtainPairSerializer(TokenObtainPairSerializer):
    """
    Custom JWT token serializer with additional user information.
    """

    def validate(self, attrs):
        """Validate credentials and return token data"""
        data = super().validate(attrs)

        # Add user information to response
        data['user'] = UserProfileSerializer(self.user).data

        return data


class RoleSerializer(serializers.ModelSerializer):
    """
    Serializer for Role model.
    """

    class Meta:
        model = Role
        fields = [
            'id',
            'name',
            'description',
            'created_at',
            'updated_at',
        ]


class UserRoleSerializer(serializers.ModelSerializer):
    """
    Serializer for UserRole relationship.
    """
    user_email = serializers.CharField(source='user.email', read_only=True)
    user_full_name = serializers.CharField(source='user.get_full_name', read_only=True)
    role_name = serializers.CharField(source='role.name', read_only=True)
    role_description = serializers.CharField(source='role.description', read_only=True)
    assigned_by_email = serializers.CharField(source='assigned_by.email', read_only=True, allow_null=True)

    class Meta:
        model = UserRole
        fields = [
            'id',
            'user',
            'user_email',
            'user_full_name',
            'role',
            'role_name',
            'role_description',
            'assigned_by',
            'assigned_by_email',
            'assigned_at',
        ]
        read_only_fields = [
            'id',
            'assigned_at',
        ]


class UserRoleAssignmentSerializer(serializers.Serializer):
    """
    Serializer for assigning roles to users.
    """
    user_id = serializers.UUIDField()
    role_name = serializers.CharField()

    def validate_user_id(self, value):
        """Validate user exists"""
        try:
            User.objects.get(id=value)
        except User.DoesNotExist:
            raise serializers.ValidationError("User does not exist.")
        return value

    def validate_role_name(self, value):
        """Validate role exists"""
        if not Role.objects.filter(name=value).exists():
            raise serializers.ValidationError("Role does not exist.")
        return value
