"""
SIA HMS — Billing Engine Tests
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
from apps.bookings.models import GuestProfile, Reservation, RatePlan, ReservationStatus, BookingSource
from apps.billing.models import Invoice, InvoiceItem, Payment, InvoiceStatus, InvoiceType, InvoiceItemType, PaymentMethod

pytestmark = pytest.mark.django_db


@pytest.fixture
def billing_tenant(db):
    """Creates a test tenant for billing tests."""
    # Clean up stale test data if any
    try:
        if Client.objects.filter(schema_name="test_billing_tenant").exists():
            with schema_context("test_billing_tenant"):
                User.objects.filter(username="billing_manager@test.com").delete()
    except Exception:
        pass
    try:
        Domain.objects.filter(domain="billing-test.localhost").delete()
        Client.objects.filter(schema_name="test_billing_tenant").delete()
    except Exception:
        pass
    try:
        User.objects.filter(username="billing_manager@test.com").delete()
    except Exception:
        pass

    client = Client.objects.create(
        schema_name="test_billing_tenant",
        name="Billing Test Hotel",
        contact_email="billing_test@hotel.com",
    )
    domain = Domain.objects.create(
        domain="billing-test.localhost",
        tenant=client,
        is_primary=True,
    )
    yield client


@pytest.fixture
def billing_manager(billing_tenant):
    """Creates a manager in the context of the billing tenant."""
    with schema_context(billing_tenant.schema_name):
        user = User.objects.create(
            username="billing_manager@test.com",
            email="billing_manager@test.com",
            first_name="Billing",
            last_name="Manager",
            role=UserRole.PROPERTY_MANAGER,
            is_active=True,
        )
        user.set_password("Password123!")
        user.save()
        return user


@pytest.fixture
def billing_client(billing_tenant, billing_manager):
    """Authenticated API client routed to the billing tenant schema."""
    client = APIClient(HTTP_HOST="billing-test.localhost")
    refresh = RefreshToken.for_user(billing_manager)
    client.credentials(HTTP_AUTHORIZATION=f"Bearer {str(refresh.access_token)}")
    return client


@pytest.fixture
def billing_setup_data(billing_tenant):
    """Creates base properties, rooms, guests, and reservations."""
    with schema_context(billing_tenant.schema_name):
        prop = Property.objects.create(
            name="Pokhara Haven",
            address="Lakeside",
            city="Pokhara",
            phone="9812345678",
            email="haven@hotel.com",
        )
        rt = RoomType.objects.create(
            property=prop,
            name="Standard Double",
            max_occupancy=2,
            base_price_per_night=4000.00,
        )
        room = Room.objects.create(
            room_type=rt,
            room_number="102",
            floor=1,
            status=RoomStatus.AVAILABLE,
        )
        guest = GuestProfile.objects.create(
            first_name="Hari",
            last_name="Bahadur",
            phone="9800000001",
            email="hari@bahadur.com",
        )
        res = Reservation.objects.create(
            guest=guest,
            room=room,
            check_in_date="2026-06-14",
            check_out_date="2026-06-16",
            adults=2,
            total_nights=2,
            base_amount=8000.00,
            tax_amount=1040.00,
            total_amount=9040.00,
            status=ReservationStatus.CONFIRMED,
            booking_source=BookingSource.DIRECT,
        )
        return {"property": prop, "room_type": rt, "room": room, "guest": guest, "reservation": res}


class TestBillingCalculations:
    """Verifies invoice tax calculations and automated splits."""

    def test_invoice_creation_and_recalculations(self, billing_tenant, billing_setup_data):
        with schema_context(billing_tenant.schema_name):
            res = billing_setup_data["reservation"]
            
            # 1. Create an invoice
            invoice = Invoice.objects.create(
                invoice_type=InvoiceType.HOTEL,
                reservation=res,
                total_amount=Decimal("0.00"),
                status=InvoiceStatus.UNPAID,
            )
            
            # Verify basic default values
            assert invoice.pk is not None
            assert invoice.service_charge_rate == Decimal("10.00")
            assert invoice.tax_rate == Decimal("13.00")
            assert invoice.invoice_number.startswith("INV-2082-")

            # 2. Add an item line via the ViewSet logic (or direct simulation)
            # Create InvoiceItem. Note: manually trigger viewset recalculate logic
            # to simulate API workflow
            item = InvoiceItem.objects.create(
                invoice=invoice,
                description="Room Charge - 2 Nights",
                quantity=Decimal("2.00"),
                unit_price=Decimal("4000.00"),
                amount=Decimal("8000.00"),
                item_type=InvoiceItemType.ROOM_CHARGE,
            )

            # Recalculate
            subtotal = item.amount
            sc = subtotal * (invoice.service_charge_rate / Decimal("100.00"))
            taxable_amount = subtotal + sc
            vat = taxable_amount * (invoice.tax_rate / Decimal("100.00"))
            total = taxable_amount + vat - invoice.discount_amount

            invoice.subtotal = subtotal
            invoice.service_charge_amount = sc
            invoice.tax_amount = vat
            invoice.total_amount = total
            invoice.save()

            # Refetch
            invoice.refresh_from_db()
            assert invoice.subtotal == Decimal("8000.00")
            assert invoice.service_charge_amount == Decimal("800.00")  # 10%
            assert invoice.tax_amount == Decimal("1144.00")  # 13% of 8800
            assert invoice.total_amount == Decimal("9944.00")
            assert invoice.balance_due == Decimal("9944.00")


class TestBillingAPIs:
    """Verifies billing endpoints and manual settling."""

    def test_record_manual_payment(self, billing_tenant, billing_setup_data, billing_client):
        invoice_id = None
        with schema_context(billing_tenant.schema_name):
            res = billing_setup_data["reservation"]
            invoice = Invoice.objects.create(
                invoice_type=InvoiceType.HOTEL,
                reservation=res,
                subtotal=Decimal("5000.00"),
                service_charge_amount=Decimal("500.00"),
                tax_amount=Decimal("715.00"),
                total_amount=Decimal("6215.00"),
                balance_due=Decimal("6215.00"),
                status=InvoiceStatus.UNPAID,
            )
            invoice_id = invoice.id

        url = reverse("invoice-payments", kwargs={"pk": invoice_id})
        payload = {
            "amount": "3000.00",
            "payment_method": PaymentMethod.CASH,
            "reference_number": "REF-CASH-1",
            "notes": "Partial cash payment.",
        }

        # Perform POST request
        response = billing_client.post(url, payload)
        assert response.status_code == status.HTTP_201_CREATED
        assert response.data["amount"] == "3000.00"
        assert response.data["payment_method"] == "cash"

        # Check invoice state
        with schema_context(billing_tenant.schema_name):
            inv = Invoice.objects.get(pk=invoice_id)
            assert inv.paid_amount == Decimal("3000.00")
            assert inv.balance_due == Decimal("3215.00")
            assert inv.status == InvoiceStatus.PARTIALLY_PAID

        # Settle the rest
        payload_final = {
            "amount": "3215.00",
            "payment_method": PaymentMethod.CASH,
            "reference_number": "REF-CASH-2",
        }
        response = billing_client.post(url, payload_final)
        assert response.status_code == status.HTTP_201_CREATED

        with schema_context(billing_tenant.schema_name):
            inv = Invoice.objects.get(pk=invoice_id)
            assert inv.paid_amount == Decimal("6215.00")
            assert inv.balance_due == Decimal("0.00")
            assert inv.status == InvoiceStatus.PAID

    def test_void_invoice(self, billing_tenant, billing_setup_data, billing_client):
        invoice_id = None
        with schema_context(billing_tenant.schema_name):
            res = billing_setup_data["reservation"]
            invoice = Invoice.objects.create(
                invoice_type=InvoiceType.HOTEL,
                reservation=res,
                total_amount=Decimal("1000.00"),
                balance_due=Decimal("1000.00"),
                status=InvoiceStatus.UNPAID,
            )
            invoice_id = invoice.id

        url = reverse("invoice-void", kwargs={"pk": invoice_id})
        response = billing_client.post(url)
        assert response.status_code == status.HTTP_200_OK
        assert response.data["status"] == "voided"

        with schema_context(billing_tenant.schema_name):
            inv = Invoice.objects.get(pk=invoice_id)
            assert inv.status == InvoiceStatus.VOIDED
