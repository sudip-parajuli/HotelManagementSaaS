"""
SIA HMS — Front Desk Serializers
"""

from rest_framework import serializers
from apps.bookings.models import Reservation, ReservationStatus, GuestProfile
from apps.properties.models import Room, RoomStatus
from .models import CheckIn, CheckOut
from datetime import date


class CheckInSerializer(serializers.ModelSerializer):
    reservation_id = serializers.IntegerField(write_only=True)

    class Meta:
        model = CheckIn
        fields = [
            "id",
            "reservation_id",
            "actual_checkin_time",
            "id_document_image",
            "key_issued",
            "locker_number",
            "notes",
        ]
        read_only_fields = ["id", "actual_checkin_time"]

    def validate_reservation_id(self, value):
        try:
            res = Reservation.objects.get(id=value)
        except Reservation.DoesNotExist:
            raise serializers.ValidationError("Reservation not found.")

        if res.status != ReservationStatus.CONFIRMED:
            raise serializers.ValidationError(
                f"Reservation must be confirmed to check in. Current status: {res.status}"
            )

        today = date.today()
        if res.check_in_date > today:
            raise serializers.ValidationError(
                f"Check-in date is {res.check_in_date}. Cannot check in before that date."
            )

        return value


class CheckOutSerializer(serializers.ModelSerializer):
    reservation_id = serializers.IntegerField(write_only=True)

    class Meta:
        model = CheckOut
        fields = [
            "id",
            "reservation_id",
            "actual_checkout_time",
            "final_amount",
            "additional_charges",
            "payment_method",
            "feedback_rating",
            "feedback_comment",
        ]
        read_only_fields = ["id", "actual_checkout_time"]

    def validate_reservation_id(self, value):
        try:
            res = Reservation.objects.get(id=value)
        except Reservation.DoesNotExist:
            raise serializers.ValidationError("Reservation not found.")

        if res.status != ReservationStatus.CHECKED_IN:
            raise serializers.ValidationError(
                f"Reservation must be checked in to check out. Current status: {res.status}"
            )

        return value


class WalkInSerializer(serializers.Serializer):
    # Guest profile fields
    first_name = serializers.CharField(max_length=100)
    last_name = serializers.CharField(max_length=100)
    phone = serializers.CharField(max_length=30)
    email = serializers.EmailField(required=False, allow_blank=True, allow_null=True)
    nationality = serializers.CharField(max_length=100, default="Nepalese")
    id_type = serializers.ChoiceField(
        choices=GuestProfile.IDType.choices,
        default=GuestProfile.IDType.CITIZENSHIP,
    )
    id_number = serializers.CharField(max_length=100, required=False, allow_blank=True)

    # Stay reservation fields
    room_id = serializers.IntegerField()
    check_in_date = serializers.DateField(default=date.today)
    check_out_date = serializers.DateField()
    adults = serializers.IntegerField(default=1)
    special_requests = serializers.CharField(required=False, allow_blank=True)

    # Check-in parameters
    key_issued = serializers.CharField(max_length=50, required=False, allow_blank=True)
    locker_number = serializers.CharField(max_length=50, required=False, allow_blank=True)
    notes = serializers.CharField(required=False, allow_blank=True)

    def validate(self, attrs):
        check_in = attrs.get("check_in_date")
        check_out = attrs.get("check_out_date")
        if check_in >= check_out:
            raise serializers.ValidationError("Check-out date must be after check-in date.")

        room_id = attrs.get("room_id")
        try:
            room = Room.objects.get(id=room_id)
        except Room.DoesNotExist:
            raise serializers.ValidationError({"room_id": "Room not found."})

        if room.status != RoomStatus.AVAILABLE:
            raise serializers.ValidationError({"room_id": f"Room is currently {room.status}. Must be available."})

        # DB-level exclusion overlapping checks
        overlaps = Reservation.objects.filter(
            room=room,
            status__in=[ReservationStatus.PENDING, ReservationStatus.CONFIRMED, ReservationStatus.CHECKED_IN],
            check_in_date__lt=check_out,
            check_out_date__gt=check_in,
        ).exists()

        if overlaps:
            raise serializers.ValidationError("Room is already reserved or occupied for these dates.")

        return attrs
