"""
SIA HMS — Front Desk Operations Tests
"""

import pytest
from datetime import date, timedelta
from django.urls import reverse
from rest_framework import status
from rest_framework.test import APIClient
from django_tenants.utils import schema_context
from rest_framework_simplejwt.tokens import RefreshToken

from apps.accounts.models import UserRole, User
from apps.properties.models import Property, RoomType, Room, RoomStatus
from apps.bookings.models import GuestProfile, Reservation, RatePlan, ReservationStatus, BookingSource
from apps.frontdesk.models import CheckIn, CheckOut
from apps.housekeeping.models import HousekeepingTask, HousekeepingStatus
from apps.billing.models import Invoice, InvoiceStatus
from apps.loyalty.models import LoyaltyAccount
from apps.tenants.models import Client, Domain

pytestmark = pytest.mark.django_db


@pytest.fixture
def test_tenant(db):
    """Creates a test tenant client and domain."""
    # Clean up stale test data if any
    try:
        if Client.objects.filter(schema_name="test_frontdesk_tenant").exists():
            with schema_context("test_frontdesk_tenant"):
                User.objects.filter(username="clerk@fdtest.com").delete()
    except Exception:
        pass
    try:
        Domain.objects.filter(domain="fd-test.localhost").delete()
        Client.objects.filter(schema_name="test_frontdesk_tenant").delete()
    except Exception:
        pass
    try:
        User.objects.filter(username="clerk@fdtest.com").delete()
    except Exception:
        pass

    client = Client.objects.create(
        schema_name="test_frontdesk_tenant",
        name="Front Desk Test Hotel",
        contact_email="fd_test@hotel.com",
    )
    domain = Domain.objects.create(
        domain="fd-test.localhost",
        tenant=client,
        is_primary=True,
    )
    yield client


@pytest.fixture
def tenant_user(test_tenant):
    """Creates a front desk clerk in the context of the test tenant."""
    with schema_context(test_tenant.schema_name):
        user = User.objects.create(
            username="clerk@fdtest.com",
            email="clerk@fdtest.com",
            first_name="Front",
            last_name="Clerk",
            role=UserRole.FRONT_DESK,
            is_active=True,
        )
        user.set_password("Password123!")
        user.save()
        return user


@pytest.fixture
def tenant_auth_client(test_tenant, tenant_user):
    """Returns an authenticated APIClient routed to the tenant schema."""
    client = APIClient(HTTP_HOST="fd-test.localhost")
    refresh = RefreshToken.for_user(tenant_user)
    client.credentials(HTTP_AUTHORIZATION=f"Bearer {str(refresh.access_token)}")
    return client


@pytest.fixture
def sample_setup(test_tenant):
    """Creates basic property, room type, room, and guest profiles."""
    with schema_context(test_tenant.schema_name):
        prop = Property.objects.create(
            name="Pokhara Heights",
            address="Lakeside",
            city="Pokhara",
            phone="9811223344",
            email="pokhara@hotel.com",
        )
        
        rt = RoomType.objects.create(
            property=prop,
            name="Standard Double",
            max_occupancy=2,
            base_price_per_night=4000.00,
            weekend_price=4500.00,
            extra_person_charge=1000.00,
        )
        
        room = Room.objects.create(
            room_type=rt,
            room_number="202",
            floor=2,
            status=RoomStatus.AVAILABLE,
        )
        
        guest = GuestProfile.objects.create(
            first_name="Hari",
            last_name="Bahadur",
            email="hari@gmail.com",
            phone="9801234567",
        )
        
        return prop, rt, room, guest


class TestFrontDeskOperations:
    """Tests the front desk operations checkin, checkout, walkin and today statistics."""

    def test_today_stats(self, test_tenant, tenant_auth_client, sample_setup):
        prop, rt, room, guest = sample_setup
        with schema_context(test_tenant.schema_name):
            # Create a confirmed reservation arriving today
            res1 = Reservation.objects.create(
                guest=guest,
                room=room,
                check_in_date=date.today(),
                check_out_date=date.today() + timedelta(days=2),
                adults=2,
                total_nights=2,
                base_amount=8000,
                tax_amount=1040,
                total_amount=9040,
                status=ReservationStatus.CONFIRMED,
            )
        
        url = reverse("frontdesk-today")
        response = tenant_auth_client.get(url)
        assert response.status_code == status.HTTP_200_OK
        assert len(response.data["arrivals"]) == 1
        assert response.data["arrivals"][0]["id"] == res1.id
        assert response.data["occupancy_rate"] == 0.0 # room status is still AVAILABLE

    def test_checkin_success(self, test_tenant, tenant_auth_client, sample_setup):
        prop, rt, room, guest = sample_setup
        with schema_context(test_tenant.schema_name):
            res = Reservation.objects.create(
                guest=guest,
                room=room,
                check_in_date=date.today(),
                check_out_date=date.today() + timedelta(days=2),
                adults=2,
                total_nights=2,
                base_amount=8000,
                tax_amount=1040,
                total_amount=9040,
                status=ReservationStatus.CONFIRMED,
            )
            
        url = reverse("frontdesk-checkin")
        payload = {
            "reservation_id": res.id,
            "key_issued": "CARD-KEY-202A",
            "locker_number": "LOCKER-12",
            "notes": "VIP Guest",
        }
        
        response = tenant_auth_client.post(url, payload)
        assert response.status_code == status.HTTP_201_CREATED
        assert response.data["key_issued"] == "CARD-KEY-202A"
        
        # Verify side effects
        with schema_context(test_tenant.schema_name):
            res.refresh_from_db()
            room.refresh_from_db()
            assert res.status == ReservationStatus.CHECKED_IN
            assert room.status == RoomStatus.OCCUPIED
            assert CheckIn.objects.filter(reservation=res).exists()

    def test_checkin_future_rejected(self, test_tenant, tenant_auth_client, sample_setup):
        prop, rt, room, guest = sample_setup
        with schema_context(test_tenant.schema_name):
            # Future reservation
            res = Reservation.objects.create(
                guest=guest,
                room=room,
                check_in_date=date.today() + timedelta(days=2),
                check_out_date=date.today() + timedelta(days=4),
                adults=2,
                total_nights=2,
                base_amount=8000,
                tax_amount=1040,
                total_amount=9040,
                status=ReservationStatus.CONFIRMED,
            )
            
        url = reverse("frontdesk-checkin")
        payload = {"reservation_id": res.id, "key_issued": "KEY-1"}
        response = tenant_auth_client.post(url, payload)
        assert response.status_code == status.HTTP_400_BAD_REQUEST
        assert "reservation_id" in response.data

    def test_checkout_success(self, test_tenant, tenant_auth_client, sample_setup):
        prop, rt, room, guest = sample_setup
        with schema_context(test_tenant.schema_name):
            # Create a checked-in reservation
            res = Reservation.objects.create(
                guest=guest,
                room=room,
                check_in_date=date.today() - timedelta(days=2),
                check_out_date=date.today(),
                adults=2,
                total_nights=2,
                base_amount=8000,
                tax_amount=1040,
                total_amount=9040,
                status=ReservationStatus.CHECKED_IN,
            )
            room.status = RoomStatus.OCCUPIED
            room.save()
            
            CheckIn.objects.create(
                reservation=res,
                key_issued="KEY-2",
            )
            
        url = reverse("frontdesk-checkout")
        payload = {
            "reservation_id": res.id,
            "additional_charges": [
                {"description": "Minibar beverages", "amount": 1200.00},
                {"description": "Laundry", "amount": 500.00},
            ],
            "payment_method": "esewa",
            "feedback_rating": 5,
            "feedback_comment": "Excellent experience!",
        }
        
        response = tenant_auth_client.post(url, payload, format="json")
        assert response.status_code == status.HTTP_200_OK
        assert float(response.data["total_amount"]) == 10740.00 # 9040 + 1200 + 500
        
        # Verify side effects
        with schema_context(test_tenant.schema_name):
            res.refresh_from_db()
            room.refresh_from_db()
            
            assert res.status == ReservationStatus.CHECKED_OUT
            assert room.status == RoomStatus.DIRTY
            assert CheckOut.objects.filter(reservation=res).exists()
            
            # Housekeeping tasks automation
            assert HousekeepingTask.objects.filter(room=room, status=HousekeepingStatus.PENDING).exists()
            
            # Invoice creation
            assert Invoice.objects.filter(reservation=res, status=InvoiceStatus.PAID).exists()
            
            # Loyalty credits (10740 // 100 = 107 points)
            loyalty = LoyaltyAccount.objects.get(guest=guest)
            assert loyalty.points_balance == 107

    def test_walkin_success(self, test_tenant, tenant_auth_client, sample_setup):
        prop, rt, room, guest = sample_setup
        url = reverse("frontdesk-walkin")
        payload = {
            "first_name": "Bahadur",
            "last_name": "Shrestha",
            "phone": "9812345678",
            "email": "bahadur@outlook.com",
            "nationality": "Nepali",
            "room_id": room.id,
            "check_out_date": str(date.today() + timedelta(days=2)),
            "adults": 2,
            "key_issued": "WALK-KEY-202",
        }
        
        response = tenant_auth_client.post(url, payload)
        assert response.status_code == status.HTTP_201_CREATED
        
        with schema_context(test_tenant.schema_name):
            # Validate database records
            room.refresh_from_db()
            assert room.status == RoomStatus.OCCUPIED
            assert GuestProfile.objects.filter(phone="9812345678").exists()
            new_guest = GuestProfile.objects.get(phone="9812345678")
            assert Reservation.objects.filter(guest=new_guest, status=ReservationStatus.CHECKED_IN).exists()
