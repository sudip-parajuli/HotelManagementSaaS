"""
SIA HMS — Property & Room Serializers
"""

from rest_framework import serializers
from .models import Property, Amenity, RoomType, Room, RoomImage


class PropertySerializer(serializers.ModelSerializer):
    class Meta:
        model = Property
        fields = "__all__"


class AmenitySerializer(serializers.ModelSerializer):
    category_display = serializers.CharField(source="get_category_display", read_only=True)

    class Meta:
        model = Amenity
        fields = ["id", "name", "icon", "category", "category_display"]


class RoomImageSerializer(serializers.ModelSerializer):
    class Meta:
        model = RoomImage
        fields = ["id", "room_type", "image", "caption", "is_primary", "display_order"]


class RoomTypeSerializer(serializers.ModelSerializer):
    amenities = AmenitySerializer(many=True, read_only=True)
    amenity_ids = serializers.PrimaryKeyRelatedField(
        queryset=Amenity.objects.all(),
        many=True,
        write_only=True,
        source="amenities",
        required=False,
    )
    images = RoomImageSerializer(many=True, read_only=True)
    primary_image = serializers.SerializerMethodField()
    rooms_count = serializers.SerializerMethodField()

    class Meta:
        model = RoomType
        fields = [
            "id",
            "property",
            "name",
            "slug",
            "description",
            "max_occupancy",
            "base_price_per_night",
            "weekend_price",
            "extra_person_charge",
            "amenities",
            "amenity_ids",
            "images",
            "primary_image",
            "rooms_count",
            "is_active",
            "display_order",
            "created_at",
            "updated_at",
        ]
        read_only_fields = ["slug", "created_at", "updated_at"]

    def get_primary_image(self, obj):
        primary = obj.images.filter(is_primary=True).first()
        if primary:
            return RoomImageSerializer(primary, context=self.context).data
        # Fallback to the first image if no primary is designated
        first = obj.images.first()
        if first:
            return RoomImageSerializer(first, context=self.context).data
        return None

    def get_rooms_count(self, obj):
        return obj.rooms.count()


class RoomSerializer(serializers.ModelSerializer):
    room_type = RoomTypeSerializer(read_only=True)
    room_type_id = serializers.PrimaryKeyRelatedField(
        queryset=RoomType.objects.all(),
        write_only=True,
        source="room_type",
    )
    status_display = serializers.CharField(source="get_status_display", read_only=True)
    current_reservation_summary = serializers.SerializerMethodField()

    class Meta:
        model = Room
        fields = [
            "id",
            "room_type",
            "room_type_id",
            "room_number",
            "floor",
            "status",
            "status_display",
            "is_active",
            "notes",
            "last_cleaned_at",
            "current_reservation_summary",
            "created_at",
            "updated_at",
        ]
        read_only_fields = ["created_at", "updated_at"]

    def get_current_reservation_summary(self, obj):
        # Placeholder for reservation summary when bookings app is integrated.
        # Currently returns None because bookings models are implemented in Phase 2.
        # This allows RoomSerializer to load cleanly without dependency circles.
        if obj.status == "occupied":
            return {
                "guest_name": "In-house Guest",
                "check_in": "Today",
                "check_out": "Tomorrow",
                "reservation_id": None
            }
        return None
