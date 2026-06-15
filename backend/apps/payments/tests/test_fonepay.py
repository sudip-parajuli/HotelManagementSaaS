import pytest
from unittest.mock import patch
from decimal import Decimal
from django.urls import reverse
from django.conf import settings
from rest_framework import status
from django_tenants.utils import schema_context

from apps.billing.models import Invoice, InvoiceStatus, InvoiceType
from apps.payments.models import PaymentTransaction
from apps.payments.fonepay import (
    generate_fonepay_signature,
    initiate_fonepay_qr,
    verify_fonepay_status,
    verify_fonepay_webhook_signature
)
from apps.payments.tests.test_payments import pay_tenant, pay_manager, pay_client

pytestmark = pytest.mark.django_db


class TestFonepaySignatures:
    def setUp(self):
        self.old_secret = getattr(settings, "FONEPAY_SECRET_KEY", "")
        self.old_merchant = getattr(settings, "FONEPAY_MERCHANT_CODE", "")
        self.old_sandbox = getattr(settings, "FONEPAY_SANDBOX", True)
        
        settings.FONEPAY_SECRET_KEY = "test_secret_key"
        settings.FONEPAY_MERCHANT_CODE = "test_merchant"
        settings.FONEPAY_SANDBOX = False

    def tearDown(self):
        settings.FONEPAY_SECRET_KEY = self.old_secret
        settings.FONEPAY_MERCHANT_CODE = self.old_merchant
        settings.FONEPAY_SANDBOX = self.old_sandbox

    def test_signature_generation(self):
        self.setUp()
        try:
            data = {
                "PRN": "TX-1",
                "AMT": "100.00",
                "CRN": "NPR",
                "DT": "06/15/2026",
                "R1": "Remarks1",
                "R2": "Remarks2",
                "MD": "test_merchant",
                "MC": "test_merchant",
                "RU": "http://localhost:8000/verify-fonepay/",
            }
            sig = generate_fonepay_signature(data)
            assert len(sig) > 0
            
            data["AMT"] = "200.00"
            sig_changed = generate_fonepay_signature(data)
            assert sig != sig_changed
        finally:
            self.tearDown()

    @patch("apps.payments.fonepay.requests.post")
    def test_initiate_fonepay_qr_real(self, mock_post):
        self.setUp()
        try:
            mock_post.return_value.status_code = 200
            mock_post.return_value.json.return_value = {
                "responseCode": "0",
                "qrCode": "fonepay_qr_code_string_data_xyz",
                "message": "Success"
            }

            res = initiate_fonepay_qr(100.00, "1", "http://localhost:8000/verify-fonepay/")
            assert res["status"] == "success"
            assert res["qr_code_url"] == "fonepay_qr_code_string_data_xyz"
        finally:
            self.tearDown()

    @patch("apps.payments.fonepay.requests.post")
    def test_verify_fonepay_status_real(self, mock_post):
        self.setUp()
        try:
            mock_post.return_value.status_code = 200
            mock_post.return_value.json.return_value = {
                "responseCode": "0",
                "uniqueId": "FP-123456",
                "message": "Success"
            }

            res = verify_fonepay_status("1", 100.00)
            assert res["status"] == "success"
            assert res["transaction_code"] == "FP-123456"
        finally:
            self.tearDown()

    def test_verify_fonepay_webhook_signature(self):
        self.setUp()
        try:
            payload = {
                "PRN": "TX-1",
                "PID": "test_merchant",
                "UID": "FP-123456",
                "AMT": "100.00",
                "STATUS": "COMPLETED",
            }
            import hmac, hashlib
            message = "TX-1,test_merchant,FP-123456,100.00,COMPLETED"
            expected = hmac.new(b"test_secret_key", message.encode("utf-8"), hashlib.sha256).hexdigest()
            
            assert verify_fonepay_webhook_signature(payload, expected) is True
            assert verify_fonepay_webhook_signature(payload, "invalid_sig") is False
        finally:
            self.tearDown()


class TestFonepayAPIs:
    def test_initiate_fonepay_view(self, pay_tenant, pay_client):
        invoice_id = None
        with schema_context(pay_tenant.schema_name):
            invoice = Invoice.objects.create(
                invoice_type=InvoiceType.HOTEL,
                total_amount=Decimal("500.00"),
                balance_due=Decimal("500.00"),
                status=InvoiceStatus.UNPAID
            )
            invoice_id = invoice.id

        url = reverse("paymentgateway-initiate")
        payload = {"invoice_id": invoice_id, "gateway": "fonepay"}
        response = pay_client.post(url, payload)

        assert response.status_code == status.HTTP_200_OK
        assert "qr_code_placeholder" in response.data
        assert "transaction_id" in response.data

        tx_id = response.data["transaction_id"]
        with schema_context(pay_tenant.schema_name):
            tx = PaymentTransaction.objects.get(pk=tx_id)
            assert tx.gateway == "fonepay"
            assert tx.status == PaymentTransaction.StatusChoices.PENDING

    @patch("apps.payments.fonepay.requests.post")
    def test_verify_polling_fonepay_view_real(self, mock_post, pay_tenant, pay_client):
        invoice_id = None
        tx_id = None
        with schema_context(pay_tenant.schema_name):
            invoice = Invoice.objects.create(
                invoice_type=InvoiceType.HOTEL,
                total_amount=Decimal("500.00"),
                balance_due=Decimal("500.00"),
                status=InvoiceStatus.UNPAID
            )
            tx = PaymentTransaction.objects.create(
                invoice=invoice,
                gateway="fonepay",
                amount=Decimal("500.00"),
                status=PaymentTransaction.StatusChoices.PENDING
            )
            invoice_id = invoice.id
            tx_id = tx.id

        # Temporarily enable production credentials check in settings to test actual api call
        settings.FONEPAY_SECRET_KEY = "test_secret_key"
        settings.FONEPAY_MERCHANT_CODE = "test_merchant"
        settings.FONEPAY_SANDBOX = False

        # Mock Fonepay verification response as success
        mock_post.return_value.status_code = 200
        mock_post.return_value.json.return_value = {
            "responseCode": "0",
            "uniqueId": "FP-987654",
            "message": "Success"
        }

        try:
            url = reverse("paymentgateway-verify-polling", kwargs={"pk": tx_id})
            response = pay_client.post(url)
            assert response.status_code == status.HTTP_200_OK
            assert response.data["status"] == "success"
            
            with schema_context(pay_tenant.schema_name):
                tx.refresh_from_db()
                assert tx.status == PaymentTransaction.StatusChoices.SUCCESS
                assert tx.gateway_ref == "FP-987654"
                invoice.refresh_from_db()
                assert invoice.status == InvoiceStatus.PAID
                assert invoice.balance_due == Decimal("0.00")
        finally:
            # Revert settings
            settings.FONEPAY_SECRET_KEY = ""
            settings.FONEPAY_MERCHANT_CODE = ""
            settings.FONEPAY_SANDBOX = True
