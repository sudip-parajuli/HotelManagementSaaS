"""
SIA HMS — Staff App Serializers
Handles Department, StaffMember, and StaffDocument serialization.
"""

from rest_framework import serializers
from django.contrib.auth import get_user_model
from django.db import transaction
from .models import Department, StaffMember, StaffDocument

User = get_user_model()


class DepartmentSerializer(serializers.ModelSerializer):
    head_name = serializers.CharField(source="head.user.get_full_name", read_only=True)

    class Meta:
        model = Department
        fields = ["id", "name", "head", "head_name", "created_at", "updated_at"]
        read_only_fields = ["id", "created_at", "updated_at"]


class StaffDocumentSerializer(serializers.ModelSerializer):
    file_url = serializers.SerializerMethodField()

    class Meta:
        model = StaffDocument
        fields = ["id", "staff", "document_type", "file", "file_url", "expiry_date", "notes", "created_at"]
        read_only_fields = ["id", "created_at"]

    def get_file_url(self, obj):
        if obj.file:
            request = self.context.get("request")
            if request:
                return request.build_absolute_uri(obj.file.url)
            return obj.file.url
        return None


class StaffUserSerializer(serializers.ModelSerializer):
    """
    Nested serializer for User fields on StaffMember.
    """
    password = serializers.CharField(write_only=True, required=False)

    class Meta:
        model = User
        fields = ["id", "email", "first_name", "last_name", "phone", "role", "password", "is_active"]
        read_only_fields = ["id"]


class StaffMemberSerializer(serializers.ModelSerializer):
    user = StaffUserSerializer()
    department_name = serializers.CharField(source="department.name", read_only=True)
    profile_photo_url = serializers.SerializerMethodField()
    full_name = serializers.CharField(source="user.get_full_name", read_only=True)
    email = serializers.EmailField(source="user.email", read_only=True)

    class Meta:
        model = StaffMember
        fields = [
            "id",
            "user",
            "full_name",
            "email",
            "department",
            "department_name",
            "designation",
            "hire_date",
            "employment_type",
            "base_salary",
            "salary_type",
            "bank_name",
            "bank_account_number",
            "emergency_contact_name",
            "emergency_contact_phone",
            "profile_photo",
            "profile_photo_url",
            "tax_filing_status",
            "attendance_pin",
            "is_active",
            "created_at",
            "updated_at",
        ]
        read_only_fields = ["id", "created_at", "updated_at"]

    def get_profile_photo_url(self, obj):
        if obj.profile_photo:
            request = self.context.get("request")
            if request:
                return request.build_absolute_uri(obj.profile_photo.url)
            return obj.profile_photo.url
        return None

    def validate_attendance_pin(self, value):
        if not value.isdigit() or len(value) != 4:
            raise serializers.ValidationError("Attendance PIN must be a 4-digit numeric code.")
        return value

    @transaction.atomic
    def create(self, validated_data):
        user_data = validated_data.pop("user")
        password = user_data.pop("password", None)
        
        # Determine username from email
        email = user_data.get("email")
        user_data["username"] = email
        
        # Create User
        user = User(**user_data)
        if password:
            user.set_password(password)
        else:
            user.set_unusable_password()
        user.save()

        # Create StaffMember
        staff_member = StaffMember.objects.create(user=user, **validated_data)
        return staff_member

    @transaction.atomic
    def update(self, instance, validated_data):
        user_data = validated_data.pop("user", None)
        if user_data:
            user = instance.user
            password = user_data.pop("password", None)
            
            # Update user fields
            for attr, value in user_data.items():
                setattr(user, attr, value)
            
            if password:
                user.set_password(password)
                
            # Update username to email if email changed
            if "email" in user_data:
                user.username = user_data["email"]
                
            user.save()

        # Update remaining StaffMember fields
        for attr, value in validated_data.items():
            setattr(instance, attr, value)
        instance.save()

        return instance
