"""
SIA HMS — Nepal Payments Integration Tests
"""

import pytest
import json
import base64
from unittest.mock import patch, MagicMock
from decimal import Decimal
from django.urls import reverse
from django.conf import settings
from rest_framework import status
from rest_framework.test import APIClient
from django_tenants.utils import schema_context
from rest_framework_simplejwt.tokens import RefreshToken

from apps.accounts.models import UserRole, User
from apps.tenants.models import Client, Domain
from apps.billing.models import Invoice, InvoiceStatus, InvoiceType
from apps.payments.models import PaymentTransaction
from apps.payments.esewa import generate_esewa_signature, verify_esewa_signature

pytestmark = pytest.mark.django_db


@pytest.fixture
def pay_tenant(db):
    """Creates a test tenant for payment tests."""
    # Clean up stale test data if any
    try:
        if Client.objects.filter(schema_name="test_pay_tenant").exists():
            with schema_context("test_pay_tenant"):
                User.objects.filter(username="pay_manager@test.com").delete()
    except Exception:
        pass
    try:
        Domain.objects.filter(domain="pay-test.localhost").delete()
        Client.objects.filter(schema_name="test_pay_tenant").delete()
    except Exception:
        pass
    try:
        User.objects.filter(username="pay_manager@test.com").delete()
    except Exception:
        pass

    client = Client.objects.create(
        schema_name="test_pay_tenant",
        name="Payments Test Hotel",
        contact_email="pay_test@hotel.com",
    )
    domain = Domain.objects.create(
        domain="pay-test.localhost",
        tenant=client,
        is_primary=True,
    )
    yield client


@pytest.fixture
def pay_manager(pay_tenant):
    """Creates a manager user."""
    with schema_context(pay_tenant.schema_name):
        user = User.objects.create(
            username="pay_manager@test.com",
            email="pay_manager@test.com",
            role=UserRole.PROPERTY_MANAGER,
            is_active=True,
        )
        user.set_password("Password123!")
        user.save()
        return user


@pytest.fixture
def pay_client(pay_tenant, pay_manager):
    """Authenticated API client for payments."""
    client = APIClient(HTTP_HOST="pay-test.localhost")
    refresh = RefreshToken.for_user(pay_manager)
    client.credentials(HTTP_AUTHORIZATION=f"Bearer {str(refresh.access_token)}")
    return client


class TestEsewaSignatures:
    """Verifies signature generation and verification matches eSewa epay requirements."""

    def test_esewa_signature_generation(self):
        # Verify HMAC-SHA256 signature returns a valid hash using settings configuration
        total_amount = "100.0"
        tx_uuid = "TX-123"
        sig = generate_esewa_signature(total_amount, tx_uuid)
        assert sig is not None
        assert len(sig) > 0

        # Verify validation matches
        data = {"total_amount": total_amount, "transaction_uuid": tx_uuid}
        assert verify_esewa_signature(data, sig) is True


class TestPaymentAPIs:
    """Verifies gateway checkouts initiation and callback verification endpoints."""

    def test_initiate_esewa_checkout(self, pay_tenant, pay_client):
        invoice_id = None
        with schema_context(pay_tenant.schema_name):
            invoice = Invoice.objects.create(
                invoice_type=InvoiceType.HOTEL,
                total_amount=Decimal("1500.00"),
                balance_due=Decimal("1500.00"),
                status=InvoiceStatus.UNPAID,
            )
            invoice_id = invoice.id

        url = reverse("paymentgateway-initiate")
        payload = {"invoice_id": invoice_id, "gateway": "esewa"}
        response = pay_client.post(url, payload)

        assert response.status_code == status.HTTP_200_OK
        assert "esewa_payload" in response.data
        assert response.data["esewa_payload"]["total_amount"] == "1500.00"
        assert "signature" in response.data["esewa_payload"]

    @patch("apps.payments.views.initiate_khalti_payment")
    def test_initiate_khalti_checkout(self, mock_initiate, pay_tenant, pay_client):
        invoice_id = None
        with schema_context(pay_tenant.schema_name):
            invoice = Invoice.objects.create(
                invoice_type=InvoiceType.HOTEL,
                total_amount=Decimal("2000.00"),
                balance_due=Decimal("2000.00"),
                status=InvoiceStatus.UNPAID,
            )
            invoice_id = invoice.id

        # Mock Khalti API success response
        mock_initiate.return_value = {
            "pidx": "KHALTI_PIDX_MOCK_123",
            "payment_url": "https://test-pay.khalti.com/?pidx=KHALTI_PIDX_MOCK_123",
        }

        url = reverse("paymentgateway-initiate")
        payload = {"invoice_id": invoice_id, "gateway": "khalti"}
        response = pay_client.post(url, payload)

        assert response.status_code == status.HTTP_200_OK
        assert response.data["pidx"] == "KHALTI_PIDX_MOCK_123"
        assert "payment_url" in response.data

    def test_verify_polling_fonepay(self, pay_tenant, pay_client):
        invoice_id = None
        tx_id = None
        with schema_context(pay_tenant.schema_name):
            invoice = Invoice.objects.create(
                invoice_type=InvoiceType.HOTEL,
                total_amount=Decimal("1000.00"),
                balance_due=Decimal("1000.00"),
                status=InvoiceStatus.UNPAID,
            )
            tx = PaymentTransaction.objects.create(
                invoice=invoice,
                gateway="fonepay",
                amount=Decimal("1000.00"),
                status="pending",
            )
            invoice_id = invoice.id
            tx_id = tx.id

        url = reverse("paymentgateway-verify-polling", kwargs={"pk": tx_id})
        response = pay_client.post(url)
        assert response.status_code == status.HTTP_200_OK
        assert response.data["status"] == "success"
        assert response.data["invoice_id"] == invoice_id

        # Verify invoice is paid
        with schema_context(pay_tenant.schema_name):
            inv = Invoice.objects.get(pk=invoice_id)
            assert inv.status == InvoiceStatus.PAID
            assert inv.balance_due == Decimal("0.00")
