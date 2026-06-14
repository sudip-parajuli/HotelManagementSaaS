"""
SIA HMS — Housekeeping Serializers
"""

from rest_framework import serializers
from django.contrib.auth import get_user_model
from apps.properties.models import Room
from .models import HousekeepingTask, MaintenanceRequest

User = get_user_model()


class HousekeepingTaskSerializer(serializers.ModelSerializer):
    room_number = serializers.CharField(source="room.room_number", read_only=True)
    room_floor = serializers.IntegerField(source="room.floor", read_only=True)
    room_status = serializers.CharField(source="room.status", read_only=True)
    assigned_to_name = serializers.SerializerMethodField(read_only=True)
    
    # Writeable relation binders
    room_id = serializers.PrimaryKeyRelatedField(
        queryset=Room.objects.all(),
        source="room",
        write_only=True,
    )
    assigned_to_id = serializers.PrimaryKeyRelatedField(
        queryset=User.objects.all(),
        source="assigned_to",
        required=False,
        allow_null=True,
        write_only=True,
    )

    class Meta:
        model = HousekeepingTask
        fields = [
            "id",
            "room",
            "room_id",
            "room_number",
            "room_floor",
            "room_status",
            "assigned_to",
            "assigned_to_id",
            "assigned_to_name",
            "task_type",
            "status",
            "priority",
            "triggered_by",
            "notes",
            "issue_description",
            "completion_photo",
            "due_by",
            "started_at",
            "completed_at",
            "created_at",
            "updated_at",
        ]
        read_only_fields = [
            "id",
            "room",
            "assigned_to",
            "started_at",
            "completed_at",
            "created_at",
            "updated_at",
        ]

    def get_assigned_to_name(self, obj):
        if obj.assigned_to:
            return obj.assigned_to.get_full_name() or obj.assigned_to.username
        return None


class MaintenanceRequestSerializer(serializers.ModelSerializer):
    room_number = serializers.CharField(source="room.room_number", read_only=True)
    reported_by_name = serializers.SerializerMethodField(read_only=True)
    resolved_by_name = serializers.SerializerMethodField(read_only=True)

    room_id = serializers.PrimaryKeyRelatedField(
        queryset=Room.objects.all(),
        source="room",
        write_only=True,
    )

    class Meta:
        model = MaintenanceRequest
        fields = [
            "id",
            "room",
            "room_id",
            "room_number",
            "reported_by",
            "reported_by_name",
            "category",
            "status",
            "description",
            "resolved_by",
            "resolved_by_name",
            "resolution_notes",
            "resolved_at",
            "created_at",
        ]
        read_only_fields = [
            "id",
            "room",
            "reported_by",
            "resolved_by",
            "resolved_at",
            "created_at",
        ]

    def get_reported_by_name(self, obj):
        if obj.reported_by:
            return obj.reported_by.get_full_name() or obj.reported_by.username
        return None

    def get_resolved_by_name(self, obj):
        if obj.resolved_by:
            return obj.resolved_by.get_full_name() or obj.resolved_by.username
        return None
