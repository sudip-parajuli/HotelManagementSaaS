"""
SIA HMS — Impersonation Audit Log & Token Hardening Tests
"""

import pytest
from rest_framework import status
from django.urls import reverse
from django.utils import timezone
import datetime
from apps.accounts.models import User, UserRole, ImpersonationLog
from apps.tenants.models import Client
from rest_framework_simplejwt.tokens import AccessToken, RefreshToken

pytestmark = pytest.mark.django_db


@pytest.fixture
def super_admin_user():
    user = User.objects.filter(email="superadmin@sia.com").first()
    if not user:
        user = User.objects.create(
            email="superadmin@sia.com",
            username="superadmin@sia.com",
            role=UserRole.SUPER_ADMIN,
            is_active=True
        )
        user.set_password("Password123!")
        user.save()
    return user


@pytest.fixture
def dummy_tenant():
    # Clean up tenant if it already exists to avoid duplicate schemas in test DB
    Client.objects.filter(schema_name="audit_test_tenant").delete()
    return Client.objects.create(
        schema_name="audit_test_tenant",
        name="Audit Test Hotel",
        contact_email="audit@hotel.com",
    )


class TestImpersonationAuditLogs:

    def test_impersonation_logs_creation_and_lifetimes(self, api_client, super_admin_user, dummy_tenant):
        api_client.force_authenticate(user=super_admin_user)
        
        # 1. Try impersonation without reason (should fail)
        url = reverse("admin-tenants-impersonate", kwargs={"pk": dummy_tenant.id})
        response = api_client.post(url, {}, format="json")
        assert response.status_code == status.HTTP_400_BAD_REQUEST
        assert "reason" in response.data

        # 2. Try impersonation with reason
        reason = "Investigating booking checkout page failure reported by manager"
        response = api_client.post(url, {"reason": reason}, format="json")
        assert response.status_code == status.HTTP_200_OK
        assert "access" in response.data
        assert "refresh" in response.data
        
        # Check audit log in DB
        log = ImpersonationLog.objects.filter(admin_user=super_admin_user, target_tenant=dummy_tenant).first()
        assert log is not None
        assert log.reason == reason
        assert log.ended_at is None
        assert log.ip_address is not None

        # Verify access token has 10 min lifetime
        access = AccessToken(response.data["access"])
        refresh = RefreshToken(response.data["refresh"])
        
        # Token exp claims are timestamps. Let's make sure the expiration matches ~10 minutes
        now = timezone.now()
        
        access_exp = datetime.datetime.fromtimestamp(access["exp"], tz=datetime.timezone.utc)
        refresh_exp = datetime.datetime.fromtimestamp(refresh["exp"], tz=datetime.timezone.utc)
        
        assert abs((access_exp - now).total_seconds() - 600) < 30
        assert abs((refresh_exp - now).total_seconds() - 600) < 30

    def test_stop_impersonation(self, api_client, super_admin_user, dummy_tenant):
        api_client.force_authenticate(user=super_admin_user)
        
        # Start impersonation
        url = reverse("admin-tenants-impersonate", kwargs={"pk": dummy_tenant.id})
        api_client.post(url, {"reason": "Authorized audit testing"}, format="json")
        
        log = ImpersonationLog.objects.filter(admin_user=super_admin_user, ended_at__isnull=True).first()
        assert log is not None
        
        # Stop impersonation
        stop_url = reverse("admin-tenants-stop-impersonation")
        response = api_client.post(stop_url, {}, format="json")
        assert response.status_code == status.HTTP_200_OK
        
        log.refresh_from_db()
        assert log.ended_at is not None

    def test_refresh_token_blocked_for_impersonation(self, api_client, super_admin_user, dummy_tenant):
        api_client.force_authenticate(user=super_admin_user)
        
        # Start impersonation to get tokens
        url = reverse("admin-tenants-impersonate", kwargs={"pk": dummy_tenant.id})
        response = api_client.post(url, {"reason": "Testing refresh blockage"}, format="json")
        refresh_token = response.data["refresh"]
        
        # Unauthenticate to test refresh endpoint
        api_client.force_authenticate(user=None)
        
        # Try refreshing the token
        refresh_url = reverse("auth-refresh")
        response = api_client.post(refresh_url, {"refresh": refresh_token}, format="json")
        assert response.status_code == status.HTTP_403_FORBIDDEN
        assert response.data["code"] == "IMPERSONATION_REFRESH_BLOCKED"

    def test_audit_logs_listing_endpoint(self, api_client, super_admin_user, dummy_tenant):
        api_client.force_authenticate(user=super_admin_user)
        
        # Clear existing logs to be safe
        ImpersonationLog.objects.all().delete()

        # Create some logs manually
        ImpersonationLog.objects.create(
            admin_user=super_admin_user,
            target_tenant=dummy_tenant,
            reason="Log 1",
            ip_address="127.0.0.1"
        )
        ImpersonationLog.objects.create(
            admin_user=super_admin_user,
            target_tenant=dummy_tenant,
            reason="Log 2",
            ip_address="127.0.0.1"
        )
        
        url = reverse("admin-impersonation-logs-list")
        response = api_client.get(url)
        assert response.status_code == status.HTTP_200_OK
        assert response.data["count"] == 2
        
        reasons = [item["reason"] for item in response.data["results"]]
        assert "Log 1" in reasons
        assert "Log 2" in reasons
