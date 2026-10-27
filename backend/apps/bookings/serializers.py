"""
SIA HMS — Booking & Reservation Serializers
"""

from rest_framework import serializers
from datetime import date
from decimal import Decimal
from django.db import transaction
from django.utils import timezone

from apps.properties.serializers import RoomSerializer
from apps.properties.models import Room, RoomStatus
from .models import GuestProfile, Reservation, RatePlan, ReservationStatus, BookingSource
from .availability import calculate_price, get_available_rooms


class GuestProfileSerializer(serializers.ModelSerializer):
    full_name = serializers.CharField(read_only=True)

    class Meta:
        model = GuestProfile
        fields = "__all__"


class RatePlanSerializer(serializers.ModelSerializer):
    class Meta:
        model = RatePlan
        fields = "__all__"


class ReservationSerializer(serializers.ModelSerializer):
    guest = GuestProfileSerializer(read_only=True)
    guest_id = serializers.PrimaryKeyRelatedField(
        queryset=GuestProfile.objects.all(),
        write_only=True,
        source="guest",
    )
    room = RoomSerializer(read_only=True)
    room_id = serializers.PrimaryKeyRelatedField(
        queryset=Room.objects.all(),
        write_only=True,
        source="room",
    )
    status_display = serializers.CharField(source="get_status_display", read_only=True)
    booking_source_display = serializers.CharField(source="get_booking_source_display", read_only=True)

    class Meta:
        model = Reservation
        fields = [
            "id",
            "guest",
            "guest_id",
            "room",
            "room_id",
            "check_in_date",
            "check_out_date",
            "adults",
            "children",
            "infants",
            "status",
            "status_display",
            "booking_source",
            "booking_source_display",
            "total_nights",
            "base_amount",
            "tax_amount",
            "discount_amount",
            "total_amount",
            "deposit_paid",
            "deposit_amount",
            "special_requests",
            "internal_notes",
            "confirmed_at",
            "cancelled_at",
            "cancellation_reason",
            "created_by",
            "created_at",
            "updated_at",
        ]
        read_only_fields = [
            "total_nights",
            "base_amount",
            "tax_amount",
            "total_amount",
            "confirmed_at",
            "cancelled_at",
            "created_by",
            "created_at",
            "updated_at",
        ]

    def validate(self, attrs):
        check_in = attrs.get("check_in_date", getattr(self.instance, "check_in_date", None))
        check_out = attrs.get("check_out_date", getattr(self.instance, "check_out_date", None))
        room = attrs.get("room", getattr(self.instance, "room", None))
        
        if check_in and check_out:
            if check_in < timezone.localdate() and not self.instance:
                raise serializers.ValidationError({"check_in_date": "Check-in date cannot be in the past."})
            if check_in >= check_out:
                raise serializers.ValidationError({"check_out_date": "Check-out date must be after check-in date."})

        if room:
            if not room.is_active or not room.room_type.is_active or room.status in [RoomStatus.MAINTENANCE, RoomStatus.OUT_OF_ORDER]:
                raise serializers.ValidationError({"room_id": "This room is not available for reservations."})
            adults = attrs.get("adults", getattr(self.instance, "adults", 1))
            children = attrs.get("children", getattr(self.instance, "children", 0))
            if adults < 1 or children < 0 or adults + children > room.room_type.max_occupancy:
                raise serializers.ValidationError({"adults": "Guest count exceeds room capacity or is invalid."})
        discount = attrs.get("discount_amount", getattr(self.instance, "discount_amount", 0))
        if discount < 0:
            raise serializers.ValidationError({"discount_amount": "Discount cannot be negative."})

        # Effective fields above ensure PATCH requests also check overlapping stays.
        if room and check_in and check_out:
            active_statuses = [
                ReservationStatus.PENDING,
                ReservationStatus.CONFIRMED,
                ReservationStatus.CHECKED_IN,
            ]
            
            overlapping = Reservation.objects.filter(
                room=room,
                status__in=active_statuses,
                check_in_date__lt=check_out,
                check_out_date__gt=check_in,
            )
            
            if self.instance:
                overlapping = overlapping.exclude(id=self.instance.id)

            if overlapping.exists():
                raise serializers.ValidationError(
                    "Room is already booked or occupied during the selected date range."
                )

        return attrs

    @transaction.atomic
    def create(self, validated_data):
        # Serialize competing bookings against the same room, then recheck availability.
        Room.objects.select_for_update().get(pk=validated_data["room"].pk)
        self.validate(validated_data)
        room = validated_data["room"]
        check_in = validated_data["check_in_date"]
        check_out = validated_data["check_out_date"]
        discount_amount = Decimal(str(validated_data.get("discount_amount", 0)))

        # Automatically calculate pricing details
        pricing = calculate_price(room.room_type, check_in, check_out)
        
        validated_data["total_nights"] = pricing["nights"]
        validated_data["base_amount"] = pricing["base_amount"]
        validated_data["tax_amount"] = pricing["tax_amount"]
        
        # Apply discount to total
        total = pricing["total_amount"] - discount_amount
        validated_data["total_amount"] = max(total, 0)
        
        # Assign creator from request if present
        request = self.context.get("request")
        if request and request.user and request.user.is_authenticated:
            validated_data["created_by"] = request.user

        return super().create(validated_data)

    @transaction.atomic
    def update(self, instance, validated_data):
        # Lock in a stable order when a reservation moves between rooms.
        room = validated_data.get("room", instance.room)
        list(Room.objects.select_for_update().filter(pk__in=[instance.room_id, room.pk]).order_by("pk"))
        self.validate(validated_data)
        pricing = calculate_price(room.room_type, validated_data.get("check_in_date", instance.check_in_date), validated_data.get("check_out_date", instance.check_out_date))
        discount = Decimal(str(validated_data.get("discount_amount", instance.discount_amount)))
        validated_data.update(total_nights=pricing["nights"], base_amount=pricing["base_amount"], tax_amount=pricing["tax_amount"], total_amount=max(pricing["total_amount"] - discount, Decimal("0.00")))
        return super().update(instance, validated_data)
