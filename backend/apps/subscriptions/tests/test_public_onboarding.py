"""
SIA HMS — SaaS Public Onboarding Integration Tests
"""

import pytest
from django.urls import reverse
from rest_framework import status
from rest_framework.test import APIClient
from django.utils import timezone
from datetime import timedelta

from apps.accounts.models import User, UserRole
from apps.tenants.models import Client, Domain
from apps.subscriptions.models import SubscriptionPlan, TenantSubscription, SubscriptionStatus

pytestmark = pytest.mark.django_db

@pytest.fixture
def sample_plan(db):
    # Clean up any conflicting tenants and plans first
    try:
        if Client.objects.filter(schema_name="everest_resort").exists():
            with schema_context("everest_resort"):
                User.objects.filter(username="manager@everest.com").delete()
    except Exception:
        pass
    try:
        Domain.objects.filter(domain="everest.localhost").delete()
        Client.objects.filter(schema_name="everest_resort").delete()
    except Exception:
        pass
    try:
        User.objects.filter(username="manager@everest.com").delete()
    except Exception:
        pass

    SubscriptionPlan.objects.filter(slug="starter").delete()
    return SubscriptionPlan.objects.create(
        name="Starter Plan",
        slug="starter",
        price_monthly=3000.00,
        price_yearly=32400.00,
        max_rooms=20,
        max_staff_users=10,
        max_restaurants=1,
        features=["payroll"]
    )

@pytest.mark.urls("config.urls_public")
class TestPublicOnboardingEndpoint:

    def test_public_onboard_validation(self, sample_plan):
        client = APIClient(HTTP_HOST="localhost")
        url = reverse("public-onboard")
        
        # Missing fields payload
        payload = {
            "name": "Validation Hotel",
            "schema_name": "validation_hotel"
        }
        
        response = client.post(url, payload)
        assert response.status_code == status.HTTP_400_BAD_REQUEST
        assert "error" in response.data

    def test_public_onboard_success(self, sample_plan):
        client = APIClient(HTTP_HOST="localhost")
        url = reverse("public-onboard")
        
        payload = {
            "name": "Everest Resort",
            "schema_name": "everest_resort",
            "subdomain": "everest",
            "admin_email": "manager@everest.com",
            "admin_password": "EverestPass123!",
            "plan_slug": "starter",
            "contact_phone": "+977-9841234567"
        }
        
        response = client.post(url, payload)
        assert response.status_code == status.HTTP_201_CREATED
        assert response.data["schema_name"] == "everest_resort"
        assert response.data["domain"] == "everest.localhost"
        assert response.data["plan"] == "Starter Plan"
        
        # Verify DB records
        tenant = Client.objects.get(schema_name="everest_resort")
        assert tenant.name == "Everest Resort"
        assert tenant.contact_email == "manager@everest.com"
        
        domain = Domain.objects.get(tenant=tenant)
        assert domain.domain == "everest.localhost"
        
        sub = TenantSubscription.objects.get(tenant=tenant)
        assert sub.plan == sample_plan
        assert sub.status == SubscriptionStatus.TRIAL

        # Verify admin user in shared database
        admin_user = User.objects.get(email="manager@everest.com")
        assert admin_user.role == UserRole.PROPERTY_MANAGER
        assert admin_user.check_password("EverestPass123!")

    def test_public_onboard_duplicate_email(self, sample_plan):
        client = APIClient(HTTP_HOST="localhost")
        url = reverse("public-onboard")
        
        # Create user in advance
        User.objects.create_user(
            email="duplicate@hotel.com",
            username="duplicate@hotel.com",
            password="SomePassword123!"
        )
        
        payload = {
            "name": "Duplicate Hotel",
            "schema_name": "duplicate_hotel",
            "subdomain": "duplicate",
            "admin_email": "duplicate@hotel.com",
            "admin_password": "NewPassword123!",
            "plan_slug": "starter"
        }
        
        response = client.post(url, payload)
        assert response.status_code == status.HTTP_400_BAD_REQUEST
        assert "error" in response.data
        assert "already exists" in response.data["error"]
