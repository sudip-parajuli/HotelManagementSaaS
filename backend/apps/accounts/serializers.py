"""
SIA HMS — Accounts Serializers
JWT token serializers with custom claims, user profile serializers.
"""

from rest_framework import serializers
from rest_framework_simplejwt.serializers import TokenObtainPairSerializer
from django.contrib.auth.password_validation import validate_password
from .models import User


class CustomTokenObtainPairSerializer(TokenObtainPairSerializer):
    """
    Extends JWT token with custom claims:
    - role: user's HMS role
    - full_name: display name
    - tenant_schema: current tenant schema (from request)
    """

    @classmethod
    def get_token(cls, user):
        token = super().get_token(user)
        # Add custom claims
        token["role"] = user.role
        token["full_name"] = user.full_name
        token["email"] = user.email
        # tenant_schema is added by middleware if available
        return token

    def validate(self, attrs):
        data = super().validate(attrs)
        # Add user info to response alongside tokens
        data["user"] = UserProfileSerializer(self.user).data
        return data


class UserProfileSerializer(serializers.ModelSerializer):
    """Full user profile serializer."""

    full_name = serializers.CharField(read_only=True)
    avatar_url = serializers.SerializerMethodField()

    class Meta:
        model = User
        fields = [
            "id",
            "email",
            "username",
            "first_name",
            "last_name",
            "full_name",
            "phone",
            "role",
            "preferred_language",
            "avatar",
            "avatar_url",
            "is_active",
            "date_joined",
            "last_login",
        ]
        read_only_fields = ["id", "email", "date_joined", "last_login", "role"]

    def get_avatar_url(self, obj):
        if obj.avatar:
            request = self.context.get("request")
            if request:
                return request.build_absolute_uri(obj.avatar.url)
            return obj.avatar.url
        return None


class UserUpdateSerializer(serializers.ModelSerializer):
    """Serializer for updating user profile (cannot change email or role)."""

    class Meta:
        model = User
        fields = ["first_name", "last_name", "phone", "avatar", "preferred_language"]


class ChangePasswordSerializer(serializers.Serializer):
    """Serializer for changing user password."""

    old_password = serializers.CharField(required=True, write_only=True)
    new_password = serializers.CharField(required=True, write_only=True)
    confirm_password = serializers.CharField(required=True, write_only=True)

    def validate_old_password(self, value):
        user = self.context["request"].user
        if not user.check_password(value):
            raise serializers.ValidationError("Current password is incorrect.")
        return value

    def validate(self, data):
        if data["new_password"] != data["confirm_password"]:
            raise serializers.ValidationError(
                {"confirm_password": "Passwords do not match."}
            )
        validate_password(data["new_password"], self.context["request"].user)
        return data

    def save(self):
        user = self.context["request"].user
        user.set_password(self.validated_data["new_password"])
        user.save()
        return user


class UserCreateSerializer(serializers.ModelSerializer):
    """Serializer for creating new HMS staff users (Property Manager only)."""

    password = serializers.CharField(write_only=True, required=True)

    class Meta:
        model = User
        fields = [
            "email",
            "first_name",
            "last_name",
            "phone",
            "role",
            "password",
        ]

    def validate_email(self, value):
        if User.objects.filter(email=value).exists():
            raise serializers.ValidationError("A user with this email already exists.")
        return value

    def create(self, validated_data):
        password = validated_data.pop("password")
        user = User(**validated_data)
        user.username = validated_data["email"]
        user.set_password(password)
        user.save()
        return user


from .models import ImpersonationLog

class ImpersonationLogSerializer(serializers.ModelSerializer):
    admin_user_email = serializers.EmailField(source="admin_user.email", read_only=True)
    target_tenant_name = serializers.CharField(source="target_tenant.name", read_only=True)
    target_tenant_schema = serializers.CharField(source="target_tenant.schema_name", read_only=True)

    class Meta:
        model = ImpersonationLog
        fields = [
            "id",
            "admin_user",
            "admin_user_email",
            "target_tenant",
            "target_tenant_name",
            "target_tenant_schema",
            "started_at",
            "ended_at",
            "reason",
            "ip_address",
        ]
        read_only_fields = fields

