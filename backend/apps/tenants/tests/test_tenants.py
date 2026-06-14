"""
SIA HMS — Tenant Tests
Tests for tenant creation and schema isolation.
"""

import pytest
from django.test import TestCase
from django_tenants.test.cases import TenantTestCase
from django_tenants.utils import schema_context, tenant_context


class TestClientModel(TestCase):
    """Tests for the Client (tenant) model."""

    def test_tenant_creation(self):
        """Test that a Client can be created with required fields."""
        from apps.tenants.models import Client

        # Clean up stale test data if any
        Client.objects.filter(schema_name="test_hotel").delete()

        client = Client(
            schema_name="test_hotel",
            name="Test Hotel",
            contact_email="admin@testhotel.com",
            subscription_plan="starter",
        )
        client.save()

        assert client.pk is not None
        assert client.schema_name == "test_hotel"
        assert client.name == "Test Hotel"
        assert client.is_active is True

    def test_client_str_representation(self):
        """Test __str__ returns name and schema."""
        from apps.tenants.models import Client

        client = Client(name="Hotel Paraiso", schema_name="hotel_paraiso")
        assert str(client) == "Hotel Paraiso (hotel_paraiso)"

    def test_domain_creation(self):
        """Test Domain model links to Client."""
        from apps.tenants.models import Client, Domain

        # Clean up stale test data if any
        Domain.objects.filter(domain="domaintest.siaenterprises.com.np").delete()
        Client.objects.filter(schema_name="test_domain_hotel").delete()

        client = Client(
            schema_name="test_domain_hotel",
            name="Domain Test Hotel",
            contact_email="admin@domaintest.com",
        )
        client.save()

        domain = Domain.objects.create(
            domain="domaintest.siaenterprises.com.np",
            tenant=client,
            is_primary=True,
        )

        assert domain.tenant == client
        assert str(domain) == "domaintest.siaenterprises.com.np"


class TestSchemaIsolation(TenantTestCase):
    """Tests that data in one tenant schema is not visible in another."""

    @classmethod
    def setUpClass(cls):
        from apps.tenants.models import Client, Domain
        # Clean up any stale "test" tenant from prior runs
        Domain.objects.filter(domain="test.localhost").delete()
        Client.objects.filter(schema_name="test").delete()
        super().setUpClass()

    @classmethod
    def tearDownClass(cls):
        try:
            super().tearDownClass()
        except Exception:
            pass

    @classmethod
    def setup_tenant(cls, tenant):
        tenant.name = "Test Hotel A"
        tenant.contact_email = "a@test.com"

    def test_schema_isolation(self):
        """Data created in one schema must not appear in another."""
        from apps.tenants.models import Client, Domain
        from apps.properties.models import Property

        # Clean up stale test data if any
        Domain.objects.filter(domain="testb.siaenterprises.com.np").delete()
        Client.objects.filter(schema_name="test_schema_b").delete()

        # Create a second tenant
        tenant_b = Client(
            schema_name="test_schema_b",
            name="Test Hotel B",
            contact_email="b@test.com",
        )
        tenant_b.save()
        Domain.objects.create(
            domain="testb.siaenterprises.com.np",
            tenant=tenant_b,
            is_primary=True,
        )

        # Create a Property in B's schema context
        with tenant_context(tenant_b):
            Property.objects.create(
                name="B Boutique",
                address="Pokhara",
                city="Pokhara",
                email="b@boutique.com",
                phone="9800000001",
            )

        # Verify schemas are separate
        with tenant_context(self.tenant):
            # Property in B should not appear in A's context
            assert Property.objects.filter(name="B Boutique").count() == 0
