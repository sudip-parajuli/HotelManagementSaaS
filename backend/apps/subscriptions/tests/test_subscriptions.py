"""
SIA HMS — Subscriptions & Super Admin Integration Tests
"""

import pytest
from django.urls import reverse
from rest_framework import status
from rest_framework.test import APIClient
from django.utils import timezone
from datetime import timedelta

from apps.accounts.models import User, UserRole
from apps.tenants.models import Client, Domain
from apps.subscriptions.models import SubscriptionPlan, TenantSubscription, SubscriptionInvoice, SubscriptionStatus, InvoiceStatus

pytestmark = pytest.mark.django_db


@pytest.fixture
def superadmin_client(db):
    """Returns an authenticated API client logged in as a Super Admin."""
    client = APIClient(HTTP_HOST="localhost")
    user = User.objects.filter(email="superadmin@sia.com").first()
    if not user:
        user = User.objects.create(
            email="superadmin@sia.com",
            username="superadmin@sia.com",
            first_name="Super",
            last_name="Admin",
            role=UserRole.SUPER_ADMIN,
            is_active=True
        )
        user.set_password("SecureAdminPass123!")
        user.save()
    
    # Login and get tokens
    response = client.post(
        reverse("auth-login"),
        {"email": "superadmin@sia.com", "password": "SecureAdminPass123!"}
    )
    assert response.status_code == status.HTTP_200_OK
    token = response.data["access"]
    client.credentials(HTTP_AUTHORIZATION=f"Bearer {token}")
    return client, user


@pytest.fixture
def sample_plan(db):
    return SubscriptionPlan.objects.create(
        name="Business Plan",
        slug="business",
        price_monthly=5000.00,
        price_yearly=54000.00,
        max_rooms=50,
        max_staff_users=30,
        max_restaurants=3,
        features=["payroll", "crm"]
    )


@pytest.mark.urls("config.urls_public")
class TestSuperAdminSubscriptionEndpoints:

    def test_get_metrics(self, superadmin_client, sample_plan):
        client, user = superadmin_client
        
        # Verify metrics endpoint returns correct structured data
        url = reverse("admin-metrics")
        response = client.get(url)
        assert response.status_code == status.HTTP_200_OK
        assert "active_hotels" in response.data
        assert "trial_hotels" in response.data
        assert "mrr" in response.data
        assert "growth_data" in response.data

    def test_create_tenant_onboarding(self, superadmin_client, sample_plan):
        client, user = superadmin_client
        
        url = reverse("admin-tenants-list")
        payload = {
            "name": "Himalayan Villa",
            "schema_name": "himalayan_villa",
            "subdomain": "himalayan",
            "admin_email": "admin@himalayan.com",
            "admin_password": "HimalayanPass123!",
            "plan_slug": "business",
            "contact_phone": "+977-9812345678"
        }
        
        response = client.post(url, payload)
        assert response.status_code == status.HTTP_201_CREATED
        assert response.data["schema_name"] == "himalayan_villa"
        assert "domain" in response.data
        
        # Verify db records
        tenant = Client.objects.get(schema_name="himalayan_villa")
        assert tenant.name == "Himalayan Villa"
        
        domain = Domain.objects.get(tenant=tenant)
        assert domain.domain == "himalayan.localhost"
        
        subscription = TenantSubscription.objects.get(tenant=tenant)
        assert subscription.plan == sample_plan
        assert subscription.status == SubscriptionStatus.TRIAL

    def test_impersonate_tenant(self, superadmin_client, sample_plan):
        client, user = superadmin_client
        
        # Create a dummy tenant
        tenant = Client.objects.create(
            schema_name="impersonate_tenant",
            name="Impersonate Hotel",
            contact_email="imp@hotel.com"
        )
        
        url = reverse("admin-tenants-impersonate", kwargs={"pk": tenant.id})
        response = client.post(url, {"reason": "Authorized support request"}, format="json")
        assert response.status_code == status.HTTP_200_OK
        assert "access" in response.data
        assert "refresh" in response.data
        assert response.data["schema_name"] == "impersonate_tenant"
        
        # Verify token claims
        from rest_framework_simplejwt.tokens import AccessToken
        access_token = AccessToken(response.data["access"])
        assert access_token.get("tenant_schema") == "impersonate_tenant"
        assert access_token.get("role") == UserRole.SUPER_ADMIN

    def test_suspend_and_activate_tenant(self, superadmin_client, sample_plan):
        client, user = superadmin_client
        
        tenant = Client.objects.create(
            schema_name="suspend_tenant",
            name="Suspend Hotel",
            contact_email="susp@hotel.com"
        )
        TenantSubscription.objects.create(
            tenant=tenant,
            plan=sample_plan,
            status=SubscriptionStatus.ACTIVE,
            current_period_start=timezone.localdate(),
            current_period_end=timezone.localdate() + timedelta(days=30),
            next_billing_date=timezone.localdate() + timedelta(days=30)
        )
        
        # Suspend
        suspend_url = reverse("admin-tenants-suspend", kwargs={"pk": tenant.id})
        response = client.post(suspend_url)
        assert response.status_code == status.HTTP_200_OK
        tenant.refresh_from_db()
        assert not tenant.is_active
        sub = TenantSubscription.objects.get(tenant=tenant)
        assert sub.status == SubscriptionStatus.SUSPENDED

        # Activate
        activate_url = reverse("admin-tenants-activate", kwargs={"pk": tenant.id})
        response = client.post(activate_url)
        assert response.status_code == status.HTTP_200_OK
        tenant.refresh_from_db()
        assert tenant.is_active
        sub.refresh_from_db()
        assert sub.status == SubscriptionStatus.ACTIVE

    def test_cancel_subscription(self, superadmin_client, sample_plan):
        client, user = superadmin_client
        
        tenant = Client.objects.create(
            schema_name="cancel_tenant",
            name="Cancel Hotel",
            contact_email="cancel@hotel.com"
        )
        sub = TenantSubscription.objects.create(
            tenant=tenant,
            plan=sample_plan,
            status=SubscriptionStatus.ACTIVE,
            current_period_start=timezone.localdate(),
            current_period_end=timezone.localdate() + timedelta(days=30),
            next_billing_date=timezone.localdate() + timedelta(days=30)
        )
        
        url = reverse("admin-subscriptions-cancel-subscription", kwargs={"pk": sub.id})
        response = client.post(url)
        assert response.status_code == status.HTTP_200_OK
        sub.refresh_from_db()
        assert sub.status == SubscriptionStatus.CANCELLED
        assert sub.cancelled_at is not None

    def test_mark_invoice_paid(self, superadmin_client, sample_plan):
        client, user = superadmin_client
        
        tenant = Client.objects.create(
            schema_name="invoice_tenant",
            name="Invoice Hotel",
            contact_email="invoice@hotel.com"
        )
        sub = TenantSubscription.objects.create(
            tenant=tenant,
            plan=sample_plan,
            status=SubscriptionStatus.PAST_DUE,
            current_period_start=timezone.localdate(),
            current_period_end=timezone.localdate() + timedelta(days=30),
            next_billing_date=timezone.localdate() + timedelta(days=30)
        )
        invoice = SubscriptionInvoice.objects.create(
            tenant=tenant,
            plan=sample_plan,
            amount=5000.00,
            period_start=timezone.localdate(),
            period_end=timezone.localdate() + timedelta(days=30),
            status=InvoiceStatus.PENDING
        )
        
        url = reverse("admin-invoices-mark-paid", kwargs={"pk": invoice.id})
        response = client.post(url, {"payment_ref": "TXN-12345"})
        assert response.status_code == status.HTTP_200_OK
        invoice.refresh_from_db()
        assert invoice.status == InvoiceStatus.PAID
        assert invoice.payment_ref == "TXN-12345"
        
        sub.refresh_from_db()
        assert sub.status == SubscriptionStatus.ACTIVE
