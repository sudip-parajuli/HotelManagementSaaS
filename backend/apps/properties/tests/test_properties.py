"""
SIA HMS — Property & Room Tests
"""

import pytest
from django.urls import reverse
from rest_framework import status
from rest_framework.test import APIClient
from django_tenants.utils import schema_context, tenant_context
from rest_framework_simplejwt.tokens import RefreshToken

from apps.accounts.models import UserRole, User
from apps.properties.models import Property, Amenity, RoomType, Room, RoomStatus, RoomImage
from apps.tenants.models import Client, Domain

pytestmark = pytest.mark.django_db


@pytest.fixture
def test_tenant(db):
    """
    Creates a test tenant client and domain.
    Forces schema creation and migrates it automatically.
    """
    # Clean up stale test data if any
    try:
        if Client.objects.filter(schema_name="test_properties_tenant").exists():
            with schema_context("test_properties_tenant"):
                User.objects.filter(username__in=["manager@proptest.com", "desk@proptest.com"]).delete()
    except Exception:
        pass
    try:
        Domain.objects.filter(domain="prop-test.localhost").delete()
        Client.objects.filter(schema_name="test_properties_tenant").delete()
    except Exception:
        pass
    try:
        User.objects.filter(username__in=["manager@proptest.com", "desk@proptest.com"]).delete()
    except Exception:
        pass

    client = Client.objects.create(
        schema_name="test_properties_tenant",
        name="Properties Test Hotel",
        contact_email="prop_test@hotel.com",
    )
    domain = Domain.objects.create(
        domain="prop-test.localhost",
        tenant=client,
        is_primary=True,
    )
    yield client


@pytest.fixture
def tenant_user(test_tenant):
    """Creates a user in the context of the test tenant."""
    with schema_context(test_tenant.schema_name):
        user = User.objects.create(
            username="manager@proptest.com",
            email="manager@proptest.com",
            first_name="Manager",
            last_name="User",
            role=UserRole.PROPERTY_MANAGER,
            is_active=True,
        )
        user.set_password("Password123!")
        user.save()
        return user


@pytest.fixture
def tenant_desk_user(test_tenant):
    """Creates a front desk user in the context of the test tenant."""
    with schema_context(test_tenant.schema_name):
        user = User.objects.create(
            username="desk@proptest.com",
            email="desk@proptest.com",
            first_name="Desk",
            last_name="User",
            role=UserRole.FRONT_DESK,
            is_active=True,
        )
        user.set_password("Password123!")
        user.save()
        return user


@pytest.fixture
def tenant_auth_client(test_tenant, tenant_user):
    """Returns an authenticated APIClient routed to the tenant schema."""
    client = APIClient(HTTP_HOST="prop-test.localhost")
    refresh = RefreshToken.for_user(tenant_user)
    client.credentials(HTTP_AUTHORIZATION=f"Bearer {str(refresh.access_token)}")
    return client


@pytest.fixture
def tenant_desk_client(test_tenant, tenant_desk_user):
    """Returns an authenticated Front Desk client routed to the tenant schema."""
    client = APIClient(HTTP_HOST="prop-test.localhost")
    refresh = RefreshToken.for_user(tenant_desk_user)
    client.credentials(HTTP_AUTHORIZATION=f"Bearer {str(refresh.access_token)}")
    return client


@pytest.fixture
def sample_property(test_tenant):
    """Creates a sample property under the tenant schema."""
    with schema_context(test_tenant.schema_name):
        Property.objects.all().delete()
        return Property.objects.create(
            name="Kathmandu Paraiso",
            tagline="A luxury retreat",
            address="Baluwatar",
            city="Kathmandu",
            phone="9876543210",
            email="paraiso@hotel.com",
        )


@pytest.fixture
def sample_amenity(test_tenant):
    """Creates a sample amenity under the tenant schema."""
    with schema_context(test_tenant.schema_name):
        Amenity.objects.all().delete()
        return Amenity.objects.create(
            name="High-Speed Wi-Fi",
            icon="wifi",
            category=Amenity.Category.ROOM,
        )


@pytest.fixture
def sample_room_type(test_tenant, sample_property, sample_amenity):
    """Creates a sample room type under the tenant schema."""
    with schema_context(test_tenant.schema_name):
        RoomType.objects.all().delete()
        rt = RoomType.objects.create(
            property=sample_property,
            name="Deluxe Suite",
            max_occupancy=3,
            base_price_per_night=8500.00,
            weekend_price=9500.00,
            extra_person_charge=1500.00,
        )
        rt.amenities.add(sample_amenity)
        return rt


class TestPropertiesModels:
    """Tests properties app model creation and validations."""

    def test_property_creation(self, test_tenant, sample_property):
        with schema_context(test_tenant.schema_name):
            assert sample_property.pk is not None
            assert str(sample_property) == "Kathmandu Paraiso (Kathmandu, Nepal)"

    def test_amenity_creation(self, test_tenant, sample_amenity):
        with schema_context(test_tenant.schema_name):
            assert sample_amenity.pk is not None
            assert str(sample_amenity) == "High-Speed Wi-Fi (Room)"

    def test_room_type_creation(self, test_tenant, sample_room_type):
        with schema_context(test_tenant.schema_name):
            assert sample_room_type.pk is not None
            assert sample_room_type.slug == "deluxe-suite"
            assert str(sample_room_type) == "Deluxe Suite — Kathmandu Paraiso"

    def test_room_creation(self, test_tenant, sample_room_type):
        with schema_context(test_tenant.schema_name):
            room = Room.objects.create(
                room_type=sample_room_type,
                room_number="302",
                floor=3,
                status=RoomStatus.AVAILABLE,
            )
            assert room.pk is not None
            assert str(room) == "Room 302 (Deluxe Suite)"
            assert room.status == "available"


class TestPropertiesAPIs:
    """Tests views, endpoints, filters, and custom permissions."""

    def test_list_properties(self, tenant_auth_client, sample_property):
        from django.conf import settings
        print("MIDDLEWARE IN SETTINGS:", settings.MIDDLEWARE)
        from apps.tenants.models import Domain, Client
        print("DOMAINS IN DB:", list(Domain.objects.values_list('domain', flat=True)))
        print("CLIENTS IN DB:", list(Client.objects.values_list('schema_name', flat=True)))
        url = reverse("property-list")
        response = tenant_auth_client.get(url)
        print("RESPONSE STATUS CODE:", response.status_code)
        print("RESPONSE CONTENT:", response.content)
        assert response.status_code == status.HTTP_200_OK
        assert response.data["count"] == 1
        assert response.data["results"][0]["name"] == "Kathmandu Paraiso"

    def test_create_property_denied_for_desk(self, tenant_desk_client):
        url = reverse("property-list")
        payload = {
            "name": "New Property",
            "address": "Pokhara",
            "city": "Pokhara",
            "phone": "9812345678",
            "email": "new@hotel.com",
        }
        response = tenant_desk_client.post(url, payload)
        assert response.status_code == status.HTTP_403_FORBIDDEN

    def test_create_property_success_for_manager(self, tenant_auth_client):
        url = reverse("property-list")
        payload = {
            "name": "Manager Retreat",
            "address": "Lalitpur",
            "city": "Lalitpur",
            "phone": "9812345678",
            "email": "manager-retreat@hotel.com",
        }
        response = tenant_auth_client.post(url, payload)
        assert response.status_code == status.HTTP_201_CREATED
        assert response.data["name"] == "Manager Retreat"

    def test_create_room_type(self, tenant_auth_client, sample_property, sample_amenity):
        url = reverse("room-type-list")
        payload = {
            "property": sample_property.id,
            "name": "Super Executive Double",
            "max_occupancy": 4,
            "base_price_per_night": "12000.00",
            "amenity_ids": [sample_amenity.id],
        }
        response = tenant_auth_client.post(url, payload)
        assert response.status_code == status.HTTP_201_CREATED
        assert response.data["name"] == "Super Executive Double"
        assert response.data["slug"] == "super-executive-double"
        assert len(response.data["amenities"]) == 1
        assert response.data["amenities"][0]["name"] == "High-Speed Wi-Fi"

    def test_create_room_by_desk_staff(self, tenant_desk_client, sample_room_type):
        url = reverse("room-list")
        payload = {
            "room_type_id": sample_room_type.id,
            "room_number": "101",
            "floor": 1,
            "status": "available",
        }
        response = tenant_desk_client.post(url, payload)
        assert response.status_code == status.HTTP_201_CREATED
        assert response.data["room_number"] == "101"
        assert response.data["room_type"]["name"] == "Deluxe Suite"

    def test_room_status_filtering(self, test_tenant, tenant_auth_client, sample_room_type):
        with schema_context(test_tenant.schema_name):
            Room.objects.create(room_type=sample_room_type, room_number="101", floor=1, status=RoomStatus.AVAILABLE)
            Room.objects.create(room_type=sample_room_type, room_number="102", floor=1, status=RoomStatus.DIRTY)
            Room.objects.create(room_type=sample_room_type, room_number="201", floor=2, status=RoomStatus.AVAILABLE)
            Room.objects.create(room_type=sample_room_type, room_number="202", floor=2, status=RoomStatus.MAINTENANCE)

        url = reverse("room-list")
        
        # Test available filter
        response = tenant_auth_client.get(f"{url}?status=available")
        assert response.status_code == status.HTTP_200_OK
        assert response.data["count"] == 2
        numbers = [r["room_number"] for r in response.data["results"]]
        assert "101" in numbers
        assert "201" in numbers

        # Test floor filter
        response = tenant_auth_client.get(f"{url}?floor=2")
        assert response.status_code == status.HTTP_200_OK
        assert response.data["count"] == 2
        numbers = [r["room_number"] for r in response.data["results"]]
        assert "201" in numbers
        assert "202" in numbers

        # Combined filter
        response = tenant_auth_client.get(f"{url}?floor=2&status=maintenance")
        assert response.status_code == status.HTTP_200_OK
        assert response.data["count"] == 1
        assert response.data["results"][0]["room_number"] == "202"
