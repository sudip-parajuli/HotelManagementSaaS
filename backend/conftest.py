"""
SIA HMS — Pytest Configuration
Global fixtures for the test suite. Handles django-tenants public schema setup.
"""

import pytest
from django.conf import settings


@pytest.fixture(scope="session")
def django_db_setup():
    """
    For django-tenants, the test runner needs to use the public schema.
    This fixture ensures tests run in the correct context.
    """
    pass


@pytest.fixture(autouse=True)
def setup_public_tenant(db):
    """
    Ensure the public tenant and its localhost domain exist in the test DB.
    """
    from apps.tenants.models import Client, Domain
    from django_tenants.utils import schema_context
    with schema_context("public"):
        public_tenant, created = Client.objects.get_or_create(
            schema_name="public",
            defaults={
                "name": "Public Tenant",
                "contact_email": "admin@sia.com"
            }
        )
        Domain.objects.get_or_create(
            domain="localhost",
            defaults={
                "tenant": public_tenant,
                "is_primary": True
            }
        )


@pytest.fixture(autouse=True)
def use_public_schema():
    """
    Ensure all tests run within the public schema context.
    django-tenants requires this for shared app tests.
    """
    from django_tenants.utils import schema_context
    with schema_context("public"):
        yield


@pytest.fixture
def api_client():
    """Default unauthenticated DRF API test client."""
    from rest_framework.test import APIClient
    return APIClient(HTTP_HOST="localhost")


@pytest.fixture
def create_user():
    """Factory fixture for creating test users."""
    from apps.accounts.models import User, UserRole

    def make_user(
        email="test@hotel.com",
        password="Password123!",
        role=UserRole.FRONT_DESK,
        **kwargs
    ):
        defaults = {
            "username": email,
            "first_name": "Test",
            "last_name": "User",
            "is_active": True,
        }
        defaults.update(kwargs)
        user = User.objects.create(email=email, role=role, **defaults)
        user.set_password(password)
        user.save()
        return user

    return make_user


@pytest.fixture
def super_admin(create_user):
    """A super admin user fixture."""
    from apps.accounts.models import UserRole
    return create_user(email="superadmin@sia.com", role=UserRole.SUPER_ADMIN)


@pytest.fixture
def property_manager(create_user):
    """A property manager user fixture."""
    from apps.accounts.models import UserRole
    return create_user(email="manager@hotel.com", role=UserRole.PROPERTY_MANAGER)


@pytest.fixture
def front_desk(create_user):
    """A front desk user fixture."""
    from apps.accounts.models import UserRole
    return create_user(email="desk@hotel.com", role=UserRole.FRONT_DESK)


@pytest.fixture
def auth_client(api_client, create_user):
    """
    Authenticated API client fixture.
    Returns (client, user) tuple for tests needing authentication.
    """
    from rest_framework_simplejwt.tokens import RefreshToken
    from apps.accounts.models import UserRole

    user = create_user(email="auth@hotel.com", role=UserRole.PROPERTY_MANAGER)
    refresh = RefreshToken.for_user(user)
    api_client.credentials(HTTP_AUTHORIZATION=f"Bearer {str(refresh.access_token)}")
    return api_client, user
