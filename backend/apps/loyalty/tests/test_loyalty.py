"""
SIA HMS — Loyalty and Rewards Tests
"""

import pytest
from decimal import Decimal
from django.urls import reverse
from rest_framework import status
from rest_framework.test import APIClient
from django_tenants.utils import schema_context
from rest_framework_simplejwt.tokens import RefreshToken

from apps.accounts.models import UserRole, User
from apps.tenants.models import Client, Domain
from apps.properties.models import Property, RoomType, Room, RoomStatus
from apps.bookings.models import GuestProfile, Reservation, ReservationStatus, BookingSource
from apps.billing.models import Invoice, InvoiceItem, InvoiceStatus, InvoiceType, InvoiceItemType
from apps.loyalty.models import LoyaltyAccount, LoyaltyTransaction, LoyaltyTier
from apps.crm.models import GuestActivity


pytestmark = pytest.mark.django_db


@pytest.fixture
def loyalty_tenant(db):
    """Creates a test tenant for loyalty tests."""
    # Clean up stale test data if any
    try:
        if Client.objects.filter(schema_name="test_loyalty_tenant").exists():
            with schema_context("test_loyalty_tenant"):
                User.objects.filter(username__in=["loyalty_manager@test.com", "ramesh@prasad.com"]).delete()
    except Exception:
        pass
    try:
        Domain.objects.filter(domain="loyalty-test.localhost").delete()
        Client.objects.filter(schema_name="test_loyalty_tenant").delete()
    except Exception:
        pass
    try:
        User.objects.filter(username__in=["loyalty_manager@test.com", "ramesh@prasad.com"]).delete()
    except Exception:
        pass

    client = Client.objects.create(
        schema_name="test_loyalty_tenant",
        name="Loyalty Test Hotel",
        contact_email="loyalty_test@hotel.com",
    )
    domain = Domain.objects.create(
        domain="loyalty-test.localhost",
        tenant=client,
        is_primary=True,
    )
    yield client


@pytest.fixture
def loyalty_manager(loyalty_tenant):
    """Creates a manager user."""
    with schema_context(loyalty_tenant.schema_name):
        user = User.objects.create(
            username="loyalty_manager@test.com",
            email="loyalty_manager@test.com",
            role=UserRole.PROPERTY_MANAGER,
            is_active=True,
        )
        user.set_password("Password123!")
        user.save()
        return user


@pytest.fixture
def loyalty_client(loyalty_tenant, loyalty_manager):
    """Authenticated API client routed to the loyalty tenant schema."""
    client = APIClient(HTTP_HOST="loyalty-test.localhost")
    refresh = RefreshToken.for_user(loyalty_manager)
    client.credentials(HTTP_AUTHORIZATION=f"Bearer {str(refresh.access_token)}")
    return client


@pytest.fixture
def loyalty_setup_data(loyalty_tenant):
    """Creates base entities for loyalty tests."""
    with schema_context(loyalty_tenant.schema_name):
        prop = Property.objects.create(
            name="Pokhara Haven",
            address="Lakeside",
            city="Pokhara",
            phone="9812345678",
            email="haven@hotel.com",
        )
        rt = RoomType.objects.create(
            property=prop,
            name="Standard Room",
            max_occupancy=2,
            base_price_per_night=5000.00,
        )
        room = Room.objects.create(
            room_type=rt,
            room_number="103",
            floor=1,
            status=RoomStatus.AVAILABLE,
        )
        guest = GuestProfile.objects.create(
            first_name="Ramesh",
            last_name="Prasad",
            phone="9800000005",
            email="ramesh@prasad.com",
        )
        res = Reservation.objects.create(
            guest=guest,
            room=room,
            check_in_date="2026-06-14",
            check_out_date="2026-06-15",
            adults=1,
            total_nights=1,
            base_amount=5000.00,
            tax_amount=650.00,
            total_amount=5650.00,
            status=ReservationStatus.CHECKED_IN,
            booking_source=BookingSource.DIRECT,
        )
        return {"guest": guest, "reservation": res}


class TestLoyaltySignals:
    """Verifies that signals successfully reward points and promote guest tiers."""

    def test_auto_reward_points_and_promotions(self, loyalty_tenant, loyalty_setup_data):
        with schema_context(loyalty_tenant.schema_name):
            guest = loyalty_setup_data["guest"]
            res = loyalty_setup_data["reservation"]

            # Create an unpaid invoice with NPR 60,000 to trigger tier upgrades directly
            invoice = Invoice.objects.create(
                invoice_type=InvoiceType.HOTEL,
                reservation=res,
                total_amount=Decimal("60000.00"),
                balance_due=Decimal("60000.00"),
                status=InvoiceStatus.UNPAID,
            )

            # Check that guest has no loyalty account initially
            assert LoyaltyAccount.objects.filter(guest=guest).count() == 0

            # 2. Settle the invoice to trigger the post_save signal
            invoice.status = InvoiceStatus.PAID
            invoice.save()

            # Verify Loyalty Account is created and points awarded (60,000 NPR // 100 = 600 points)
            account = LoyaltyAccount.objects.get(guest=guest)
            assert account.points_balance == 600
            
            # 600 points crosses the 500 threshold, so tier should be promoted to Silver
            assert account.tier == LoyaltyTier.SILVER

            # Verify GuestActivity logs
            earn_activity = GuestActivity.objects.filter(guest=guest, activity_type="loyalty_earn")
            assert earn_activity.exists()
            assert "Earned 600 loyalty points" in earn_activity[0].description

            upgrade_activity = GuestActivity.objects.filter(guest=guest, activity_type="profile_update", description__contains="upgraded")
            assert upgrade_activity.exists()


class TestLoyaltyAPIs:
    """Verifies loyalty accounts APIs and points redemption logic."""

    def test_points_redemption_action(self, loyalty_tenant, loyalty_setup_data, loyalty_client):
        guest_id = None
        invoice_id = None
        account_id = None
        with schema_context(loyalty_tenant.schema_name):
            guest = loyalty_setup_data["guest"]
            res = loyalty_setup_data["reservation"]

            # Create loyalty account with 2000 points (Gold tier)
            account = LoyaltyAccount.objects.create(
                guest=guest,
                points_balance=2000,
                tier=LoyaltyTier.GOLD,
            )
            account_id = account.id
            guest_id = guest.id

            # Create a pending invoice for NPR 10,000 with items
            invoice = Invoice.objects.create(
                invoice_type=InvoiceType.HOTEL,
                reservation=res,
                total_amount=Decimal("10000.00"),
                balance_due=Decimal("10000.00"),
                status=InvoiceStatus.UNPAID,
            )
            InvoiceItem.objects.create(
                invoice=invoice,
                description="Room Charge",
                quantity=Decimal("1.00"),
                unit_price=Decimal("8045.05"),
                amount=Decimal("8045.05"),
                item_type=InvoiceItemType.ROOM_CHARGE,
            )
            invoice.subtotal = Decimal("8045.05")
            invoice.service_charge_amount = Decimal("804.51")
            invoice.tax_amount = Decimal("1150.44")
            invoice.total_amount = Decimal("10000.00")
            invoice.balance_due = Decimal("10000.00")
            invoice.save()
            invoice_id = invoice.id

        # Redeem 1000 points for 500 NPR discount
        url = reverse("loyalty-account-redeem", kwargs={"pk": account_id})
        payload = {"invoice_id": invoice_id, "points": 1000}

        response = loyalty_client.post(url, payload)
        assert response.status_code == status.HTTP_200_OK
        assert response.data["points_balance"] == 1000
        # 10,000 - 500 discount (which reduces subtotal and service charge + tax!)
        # Reduction = 500 * 1.10 * 1.13 = 621.50 -> 10000 - 621.50 = 9378.50
        assert response.data["invoice_balance_due"] == "9378.50"

        # Verify database logs
        with schema_context(loyalty_tenant.schema_name):
            # Verify LoyaltyTransaction
            tx = LoyaltyTransaction.objects.filter(account_id=account_id, transaction_type="redeem")
            assert tx.count() == 1
            assert tx[0].points == -1000

            # Verify InvoiceItem Discount
            inv = Invoice.objects.get(pk=invoice_id)
            discount_item = InvoiceItem.objects.filter(invoice=inv, item_type=InvoiceItemType.DISCOUNT)
            assert discount_item.count() == 1
            assert discount_item[0].unit_price == Decimal("-500.00")

            # Verify GuestActivity
            redeem_activity = GuestActivity.objects.filter(guest_id=guest_id, activity_type="loyalty_redeem")
            assert redeem_activity.exists()
