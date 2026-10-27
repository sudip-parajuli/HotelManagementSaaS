"""Regression coverage for room availability and partial reservation edits."""
import pytest
from datetime import timedelta
from django.utils import timezone
from django_tenants.utils import schema_context
from rest_framework.exceptions import ValidationError
from apps.bookings.availability import get_available_rooms
from apps.bookings.models import Reservation, ReservationStatus
from apps.bookings.serializers import ReservationSerializer
from apps.properties.models import RoomStatus
from .test_bookings import test_tenant, sample_setup

pytestmark = pytest.mark.django_db

@pytest.mark.parametrize("check_in,check_out,adults", [(None, None, 1), ("invalid", "2027-01-02", 1), ("2027-01-02", "2027-01-01", 1), ("2027-01-01", "2027-01-02", 0)])
def test_invalid_availability_returns_validation_error(check_in, check_out, adults):
    with pytest.raises(ValidationError):
        get_available_rooms(check_in, check_out, adults)

@pytest.mark.parametrize("room_status", [RoomStatus.MAINTENANCE, RoomStatus.OUT_OF_ORDER])
def test_unsellable_rooms_are_excluded(test_tenant, sample_setup, room_status):
    _, _, room, _ = sample_setup
    with schema_context(test_tenant.schema_name):
        room.status = room_status
        room.save()
        assert not get_available_rooms(timezone.localdate(), timezone.localdate() + timedelta(days=2), 1).exists()

def test_partial_date_change_cannot_overlap_existing_reservation(test_tenant, sample_setup):
    _, _, room, guest = sample_setup
    day = timezone.localdate() + timedelta(days=5)
    with schema_context(test_tenant.schema_name):
        common = dict(room=room, guest=guest, adults=1, total_nights=2, base_amount=16000, tax_amount=2080, total_amount=18080, status=ReservationStatus.CONFIRMED)
        first = Reservation.objects.create(check_in_date=day, check_out_date=day + timedelta(days=2), **common)
        Reservation.objects.create(check_in_date=day + timedelta(days=3), check_out_date=day + timedelta(days=5), **common)
        serializer = ReservationSerializer(first, data={"check_out_date": day + timedelta(days=4)}, partial=True)
        assert not serializer.is_valid()
        assert "already booked" in str(serializer.errors)

def test_partial_date_change_recalculates_price(test_tenant, sample_setup):
    _, _, room, guest = sample_setup
    day = timezone.localdate() + timedelta(days=5)
    with schema_context(test_tenant.schema_name):
        serializer = ReservationSerializer(data={"room_id": room.id, "guest_id": guest.id, "adults": 1, "check_in_date": day, "check_out_date": day + timedelta(days=2)})
        assert serializer.is_valid(), serializer.errors
        stay = serializer.save()
        previous_total = stay.total_amount
        edit = ReservationSerializer(stay, data={"check_out_date": day + timedelta(days=3)}, partial=True)
        assert edit.is_valid(), edit.errors
        changed = edit.save()
        assert changed.total_nights == 3
        assert changed.total_amount > previous_total
