"""
SIA HMS — Analytics Tests
"""

import pytest
from rest_framework import status
from django.urls import reverse
from django.utils import timezone
from django_tenants.utils import schema_context
from rest_framework.test import APIClient

from apps.analytics.models import DailyMetric
from apps.properties.models import Property
from apps.tenants.models import Client, Domain


@pytest.fixture
def test_tenant(db):
    """Creates a test tenant schema context for analytics testing."""
    tenant = Client.objects.create(
        schema_name="test_analytics_tenant",
        name="Analytics Test Hotel",
        contact_email="analytics_test@hotel.com",
    )
    domain = Domain.objects.create(
        domain="analytics-test.localhost",
        tenant=tenant,
        is_primary=True,
    )
    yield tenant


@pytest.fixture
def test_property(test_tenant):
    """Creates a sample Property inside the test tenant context."""
    with schema_context(test_tenant.schema_name):
        return Property.objects.create(
            name="Test Boutique Hotel",
            address="Kathmandu",
            email="test@hms.com",
            phone="9800000000"
        )


@pytest.fixture
def tenant_client():
    """Client configured to target the tenant subdomain."""
    return APIClient(HTTP_HOST="analytics-test.localhost")


@pytest.mark.django_db
class TestAnalyticsEngine:

    def test_dashboard_summary_unauthenticated(self, test_tenant, tenant_client):
        url = reverse("analytics-dashboard")
        response = tenant_client.get(url)
        assert response.status_code in [status.HTTP_401_UNAUTHORIZED, status.HTTP_403_FORBIDDEN]

    def test_revenue_analytics_endpoint_empty(self, test_tenant, tenant_client, test_property):
        url = reverse("analytics-revenue")
        response = tenant_client.get(url)
        assert response.status_code in [status.HTTP_401_UNAUTHORIZED, status.HTTP_403_FORBIDDEN]

    def test_daily_metric_creation(self, test_tenant, test_property):
        with schema_context(test_tenant.schema_name):
            today = timezone.localdate()
            metric = DailyMetric.objects.create(
                property=test_property,
                date=today,
                total_revenue=15000.00,
                room_revenue=10000.00,
                restaurant_revenue=4000.00,
                other_revenue=1000.00,
                occupied_rooms=5,
                total_rooms=10,
                occupancy_rate=50.00
            )
            assert metric.id is not None
            assert metric.total_revenue == 15000.00
            assert metric.occupancy_rate == 50.00
