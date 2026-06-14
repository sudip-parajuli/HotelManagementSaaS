"""
SIA HMS — Booking & Reservation Tests
"""

import pytest
from datetime import date, timedelta
from django.urls import reverse
from rest_framework import status
from rest_framework.test import APIClient
from django_tenants.utils import schema_context
from rest_framework_simplejwt.tokens import RefreshToken

from apps.accounts.models import UserRole, User
from apps.properties.models import Property, RoomType, Room, RoomStatus, Amenity
from apps.bookings.models import GuestProfile, Reservation, RatePlan, ReservationStatus, BookingSource
from apps.bookings.availability import get_available_rooms, calculate_price
from apps.tenants.models import Client, Domain

pytestmark = pytest.mark.django_db


@pytest.fixture
def test_tenant(db):
    """Creates a test tenant client and domain, migrating schemas automatically."""
    # Clean up stale test data if any
    try:
        if Client.objects.filter(schema_name="test_bookings_tenant").exists():
            with schema_context("test_bookings_tenant"):
                User.objects.filter(username__in=["manager@bookingtest.com", "ramesh@gmail.com"]).delete()
    except Exception:
        pass
    try:
        Domain.objects.filter(domain="booking-test.localhost").delete()
        Client.objects.filter(schema_name="test_bookings_tenant").delete()
    except Exception:
        pass
    try:
        User.objects.filter(username__in=["manager@bookingtest.com", "ramesh@gmail.com"]).delete()
    except Exception:
        pass

    client = Client.objects.create(
        schema_name="test_bookings_tenant",
        name="Bookings Test Hotel",
        contact_email="booking_test@hotel.com",
    )
    domain = Domain.objects.create(
        domain="booking-test.localhost",
        tenant=client,
        is_primary=True,
    )
    yield client


@pytest.fixture
def tenant_user(test_tenant):
    """Creates a user in the context of the test tenant."""
    with schema_context(test_tenant.schema_name):
        user = User.objects.create(
            username="manager@bookingtest.com",
            email="manager@bookingtest.com",
            first_name="Manager",
            last_name="User",
            role=UserRole.PROPERTY_MANAGER,
            is_active=True,
        )
        user.set_password("Password123!")
        user.save()
        return user


@pytest.fixture
def tenant_auth_client(test_tenant, tenant_user):
    """Returns an authenticated APIClient routed to the tenant schema."""
    client = APIClient(HTTP_HOST="booking-test.localhost")
    refresh = RefreshToken.for_user(tenant_user)
    client.credentials(HTTP_AUTHORIZATION=f"Bearer {str(refresh.access_token)}")
    return client


@pytest.fixture
def sample_setup(test_tenant):
    """Creates basic property, amenity, room type, and room structures."""
    with schema_context(test_tenant.schema_name):
        prop = Property.objects.create(
            name="Kathmandu Paraiso",
            address="Baluwatar",
            city="Kathmandu",
            phone="9876543210",
            email="paraiso@hotel.com",
        )
        
        wifi = Amenity.objects.create(name="Wi-Fi", icon="wifi", category="room")
        
        rt = RoomType.objects.create(
            property=prop,
            name="Deluxe Suite",
            max_occupancy=3,
            base_price_per_night=8000.00,
            weekend_price=9000.00,
            extra_person_charge=1500.00,
        )
        rt.amenities.add(wifi)
        
        room = Room.objects.create(
            room_type=rt,
            room_number="101",
            floor=1,
            status=RoomStatus.AVAILABLE,
        )
        
        guest = GuestProfile.objects.create(
            first_name="Ramesh",
            last_name="Sharma",
            email="ramesh@gmail.com",
            phone="9841234567",
        )
        
        return prop, rt, room, guest


class TestAvailabilityEngine:
    """Tests the core get_available_rooms and calculate_price logic."""

    def test_room_is_available_when_no_bookings(self, test_tenant, sample_setup):
        prop, rt, room, guest = sample_setup
        with schema_context(test_tenant.schema_name):
            available = get_available_rooms(date.today(), date.today() + timedelta(days=2), 2)
            assert room in available

    def test_room_is_unavailable_when_booked(self, test_tenant, sample_setup):
        prop, rt, room, guest = sample_setup
        with schema_context(test_tenant.schema_name):
            # Create a booking
            Reservation.objects.create(
                guest=guest,
                room=room,
                check_in_date=date.today(),
                check_out_date=date.today() + timedelta(days=2),
                adults=2,
                total_nights=2,
                base_amount=16000,
                tax_amount=2080,
                total_amount=18080,
                status=ReservationStatus.CONFIRMED,
            )
            
            # Check availability overlapping dates
            available = get_available_rooms(date.today(), date.today() + timedelta(days=2), 2)
            assert room not in available

    def test_available_when_previous_booking_cancelled(self, test_tenant, sample_setup):
        prop, rt, room, guest = sample_setup
        with schema_context(test_tenant.schema_name):
            # Create a CANCELLED booking
            Reservation.objects.create(
                guest=guest,
                room=room,
                check_in_date=date.today(),
                check_out_date=date.today() + timedelta(days=2),
                adults=2,
                total_nights=2,
                base_amount=16000,
                tax_amount=2080,
                total_amount=18080,
                status=ReservationStatus.CANCELLED,
            )
            
            available = get_available_rooms(date.today(), date.today() + timedelta(days=2), 2)
            assert room in available

    def test_back_to_back_same_day_bookings(self, test_tenant, sample_setup):
        prop, rt, room, guest = sample_setup
        with schema_context(test_tenant.schema_name):
            # Guest A stays until today
            today = date.today()
            Reservation.objects.create(
                guest=guest,
                room=room,
                check_in_date=today - timedelta(days=2),
                check_out_date=today,
                adults=2,
                total_nights=2,
                base_amount=16000,
                tax_amount=2080,
                total_amount=18080,
                status=ReservationStatus.CHECKED_IN,
            )
            
            # Guest B arrives today
            available = get_available_rooms(today, today + timedelta(days=2), 2)
            assert room in available

    def test_calculate_price_base(self, test_tenant, sample_setup):
        prop, rt, room, guest = sample_setup
        with schema_context(test_tenant.schema_name):
            # Test mid-week pricing (assuming weekday today is Monday or Tuesday to avoid weekend override)
            # We can force date to a weekday
            weekday_date = date(2026, 6, 15)  # June 15, 2026 is a Monday
            pricing = calculate_price(rt, weekday_date, weekday_date + timedelta(days=2))
            assert pricing["nights"] == 2
            assert pricing["base_amount"] == 16000.00  # 8000 * 2
            assert pricing["tax_amount"] == 2080.00   # 16000 * 0.13
            assert pricing["total_amount"] == 18080.00

    def test_calculate_price_weekend_override(self, test_tenant, sample_setup):
        prop, rt, room, guest = sample_setup
        with schema_context(test_tenant.schema_name):
            # June 19, 2026 is a Friday (Nepal weekend Friday/Saturday)
            friday_date = date(2026, 6, 19)
            pricing = calculate_price(rt, friday_date, friday_date + timedelta(days=2))
            assert pricing["nights"] == 2
            # Friday night (9000) + Saturday night (9000) = 18000
            assert pricing["base_amount"] == 18000.00
            assert pricing["total_amount"] == 20340.00 # 18000 * 1.13

    def test_calculate_price_rate_plan(self, test_tenant, sample_setup):
        prop, rt, room, guest = sample_setup
        with schema_context(test_tenant.schema_name):
            # Create a rate plan valid for a week
            valid_from = date(2026, 6, 10)
            valid_to = date(2026, 6, 20)
            RatePlan.objects.create(
                room_type=rt,
                name="Monsoon Promo",
                price_per_night=6500.00,
                valid_from=valid_from,
                valid_to=valid_to,
                is_active=True,
            )
            
            pricing = calculate_price(rt, date(2026, 6, 12), date(2026, 6, 14))
            assert pricing["nights"] == 2
            assert pricing["base_amount"] == 13000.00  # 6500 * 2
            assert pricing["total_amount"] == 14690.00


class TestBookingsAPIs:
    """Tests reservations CRUD endpoints and custom validation."""

    def test_create_reservation_success(self, tenant_auth_client, sample_setup):
        prop, rt, room, guest = sample_setup
        url = reverse("reservation-list")
        payload = {
            "guest_id": guest.id,
            "room_id": room.id,
            "check_in_date": str(date.today()),
            "check_out_date": str(date.today() + timedelta(days=2)),
            "adults": 2,
            "status": "pending",
        }
        response = tenant_auth_client.post(url, payload)
        assert response.status_code == status.HTTP_201_CREATED
        assert response.data["total_nights"] == 2
        assert float(response.data["total_amount"]) > 0

    def test_create_reservation_overbooking_rejected(self, test_tenant, tenant_auth_client, sample_setup):
        prop, rt, room, guest = sample_setup
        with schema_context(test_tenant.schema_name):
            # Book Room 101
            Reservation.objects.create(
                guest=guest,
                room=room,
                check_in_date=date.today(),
                check_out_date=date.today() + timedelta(days=2),
                adults=2,
                total_nights=2,
                base_amount=16000,
                tax_amount=2080,
                total_amount=18080,
                status=ReservationStatus.CONFIRMED,
            )

        url = reverse("reservation-list")
        payload = {
            "guest_id": guest.id,
            "room_id": room.id,
            "check_in_date": str(date.today()),
            "check_out_date": str(date.today() + timedelta(days=2)),
            "adults": 1,
            "status": "pending",
        }
        response = tenant_auth_client.post(url, payload)
        assert response.status_code == status.HTTP_400_BAD_REQUEST
        assert "non_field_errors" in response.data or "error" in response.data or any("booked" in str(v) for v in response.data.values())

    def test_confirm_reservation(self, test_tenant, tenant_auth_client, sample_setup):
        prop, rt, room, guest = sample_setup
        with schema_context(test_tenant.schema_name):
            res = Reservation.objects.create(
                guest=guest,
                room=room,
                check_in_date=date.today(),
                check_out_date=date.today() + timedelta(days=2),
                adults=2,
                total_nights=2,
                base_amount=16000,
                tax_amount=2080,
                total_amount=18080,
                status=ReservationStatus.PENDING,
            )
        
        url = reverse("reservation-confirm", kwargs={"pk": res.id})
        response = tenant_auth_client.post(url)
        assert response.status_code == status.HTTP_200_OK
        assert response.data["status"] == "confirmed"

    def test_cancel_reservation(self, test_tenant, tenant_auth_client, sample_setup):
        prop, rt, room, guest = sample_setup
        with schema_context(test_tenant.schema_name):
            res = Reservation.objects.create(
                guest=guest,
                room=room,
                check_in_date=date.today(),
                check_out_date=date.today() + timedelta(days=2),
                adults=2,
                total_nights=2,
                base_amount=16000,
                tax_amount=2080,
                total_amount=18080,
                status=ReservationStatus.CONFIRMED,
            )
        
        url = reverse("reservation-cancel", kwargs={"pk": res.id})
        response = tenant_auth_client.post(url, {"cancellation_reason": "Change of plans"})
        assert response.status_code == status.HTTP_200_OK
        assert response.data["status"] == "cancelled"
        assert response.data["cancellation_reason"] == "Change of plans"


class TestPublicAPIs:
    """Tests unauthenticated public APIs for booking widgets."""

    def test_public_availability(self, sample_setup):
        # We need unauthenticated client
        client = APIClient(HTTP_HOST="booking-test.localhost")
        url = reverse("public-availability")
        
        check_in = str(date.today() + timedelta(days=5))
        check_out = str(date.today() + timedelta(days=7))
        
        response = client.get(f"{url}?check_in={check_in}&check_out={check_out}&adults=2")
        assert response.status_code == status.HTTP_200_OK
        assert len(response.data) == 1
        assert response.data[0]["room_type"]["name"] == "Deluxe Suite"
        assert "pricing" in response.data[0]

    def test_public_booking_create(self, sample_setup):
        client = APIClient(HTTP_HOST="booking-test.localhost")
        prop, rt, room, guest = sample_setup
        url = reverse("public-booking-create")
        
        payload = {
            "guest": {
                "first_name": "Hari",
                "last_name": "Bahadur",
                "phone": "9801112223",
                "email": "hari@gmail.com",
            },
            "booking": {
                "check_in_date": str(date.today() + timedelta(days=5)),
                "check_out_date": str(date.today() + timedelta(days=7)),
                "room_type_id": rt.id,
                "adults": 2,
                "special_requests": "Window view please",
            }
        }
        
        response = client.post(url, payload, format="json")
        assert response.status_code == status.HTTP_201_CREATED
        assert response.data["status"] == "pending"
        assert response.data["booking_source"] == "online"
