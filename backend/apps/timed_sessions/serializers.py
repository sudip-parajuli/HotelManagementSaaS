"""
SIA HMS — Timed Sessions Serializers
"""

from rest_framework import serializers
from apps.timed_sessions.models import SessionUnitType, SessionUnit, TimedSession, SessionExtension


class SessionUnitTypeSerializer(serializers.ModelSerializer):
    class Meta:
        model = SessionUnitType
        fields = [
            "id", "property", "type_name", "icon_name",
            "pricing_model", "rate", "minimum_duration_minutes",
            "maximum_duration_minutes", "overage_rate", "grace_period_minutes",
            "requires_deposit", "deposit_amount", "is_active",
            "created_at", "updated_at",
        ]
        read_only_fields = ["id", "created_at", "updated_at"]


class SessionUnitSerializer(serializers.ModelSerializer):
    unit_type_name = serializers.CharField(source="unit_type.type_name", read_only=True)

    class Meta:
        model = SessionUnit
        fields = [
            "id", "property", "unit_type", "unit_type_name",
            "unit_name", "status", "location_label",
            "position_x", "position_y", "qr_code",
            "notes", "is_active", "created_at", "updated_at",
        ]
        read_only_fields = ["id", "qr_code", "created_at", "updated_at"]


class SessionUnitStatusSerializer(serializers.Serializer):
    """Nested serializer for unit detail with live session info."""
    unit = SessionUnitSerializer(read_only=True)
    active_session = serializers.SerializerMethodField()
    live_status = serializers.SerializerMethodField()

    def get_active_session(self, obj):
        session = TimedSession.objects.filter(
            unit=obj, status__in=["active", "paused"]
        ).first()
        if session:
            return TimedSessionSerializer(session).data
        return None

    def get_live_status(self, obj):
        session = TimedSession.objects.filter(
            unit=obj, status__in=["active", "paused"]
        ).first()
        if session:
            from apps.timed_sessions.service import calculate_live_status
            return calculate_live_status(session.id)
        return None


class TimedSessionSerializer(serializers.ModelSerializer):
    unit_name = serializers.CharField(source="unit.unit_name", read_only=True)
    unit_type_name = serializers.CharField(source="unit.unit_type.type_name", read_only=True)
    extensions = serializers.SerializerMethodField()
    live_status = serializers.SerializerMethodField()

    class Meta:
        model = TimedSession
        fields = [
            "id", "unit", "unit_name", "unit_type_name",
            "guest", "guest_name", "guest_phone",
            "status", "scheduled_start", "scheduled_end",
            "actual_start", "actual_end", "paused_at", "total_paused_minutes",
            "paid_duration_minutes", "total_active_minutes",
            "base_amount", "overage_minutes", "overage_amount", "total_amount", "is_settled",
            "pos_order", "invoice", "created_by",
            "extensions", "live_status",
            "notes", "created_at", "updated_at",
        ]
        read_only_fields = [
            "id", "total_active_minutes", "base_amount",
            "overage_minutes", "overage_amount", "total_amount",
            "is_settled", "created_at", "updated_at",
        ]

    def get_extensions(self, obj):
        return SessionExtensionSerializer(obj.extensions.all(), many=True).data

    def get_live_status(self, obj):
        if obj.status in ("active", "paused"):
            from apps.timed_sessions.service import calculate_live_status
            return calculate_live_status(obj.id)
        return None


class SessionExtensionSerializer(serializers.ModelSerializer):
    extended_by_name = serializers.CharField(source="extended_by.get_full_name", read_only=True)

    class Meta:
        model = SessionExtension
        fields = [
            "id", "session", "extended_by_minutes", "additional_amount",
            "extended_by", "extended_by_name", "extended_at",
            "payment_method", "notes",
        ]
        read_only_fields = ["id", "extended_at", "extended_by_name"]


class StartSessionSerializer(serializers.Serializer):
    unit_id = serializers.IntegerField()
    guest_id = serializers.IntegerField(required=False, allow_null=True)
    guest_name = serializers.CharField(required=False, allow_blank=True, default="")
    guest_phone = serializers.CharField(required=False, allow_blank=True, default="")
    paid_minutes = serializers.IntegerField(min_value=1)


class ExtendSessionSerializer(serializers.Serializer):
    additional_minutes = serializers.IntegerField(min_value=1)
    payment_method = serializers.CharField(required=False, allow_blank=True, default="")
