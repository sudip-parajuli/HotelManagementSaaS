"""
SIA HMS — Permissions Tests
Tests for RBAC permission classes to ensure proper route security.
"""

import pytest
from unittest.mock import Mock
from django.contrib.auth.models import AnonymousUser
from apps.accounts.models import User, UserRole
from apps.accounts.permissions import (
    IsSuperAdmin,
    IsPropertyManager,
    IsFrontDesk,
    IsHousekeeping,
    IsRestaurantStaff,
    IsInventoryManager,
    IsAccountant,
    IsAnyStaff,
)

pytestmark = pytest.mark.django_db


@pytest.fixture
def mock_view():
    return Mock()


@pytest.fixture
def mock_request():
    request = Mock()
    request.user = AnonymousUser()
    return request


@pytest.fixture
def create_user():
    def make_user(email, role):
        return User.objects.create_user(
            email=email,
            username=email,
            password="Password123!",
            role=role,
            first_name="Test",
            last_name="User",
        )
    return make_user


class TestPermissions:

    def test_anonymous_denied_all(self, mock_request, mock_view):
        permissions = [
            IsSuperAdmin(),
            IsPropertyManager(),
            IsFrontDesk(),
            IsHousekeeping(),
            IsRestaurantStaff(),
            IsInventoryManager(),
            IsAccountant(),
            IsAnyStaff(),
        ]
        for permission in permissions:
            assert permission.has_permission(mock_request, mock_view) is False

    def test_super_admin_allowed_all(self, mock_request, mock_view, create_user):
        user = create_user("superadmin@hotel.com", UserRole.SUPER_ADMIN)
        mock_request.user = user

        permissions = [
            IsSuperAdmin(),
            IsPropertyManager(),
            IsFrontDesk(),
            IsHousekeeping(),
            IsRestaurantStaff(),
            IsInventoryManager(),
            IsAccountant(),
            IsAnyStaff(),
        ]
        for permission in permissions:
            assert permission.has_permission(mock_request, mock_view) is True

    def test_property_manager_permissions(self, mock_request, mock_view, create_user):
        user = create_user("manager@hotel.com", UserRole.PROPERTY_MANAGER)
        mock_request.user = user

        # Allowed for all roles except Super Admin exclusive (if any)
        assert IsSuperAdmin().has_permission(mock_request, mock_view) is False
        assert IsPropertyManager().has_permission(mock_request, mock_view) is True
        assert IsFrontDesk().has_permission(mock_request, mock_view) is True
        assert IsHousekeeping().has_permission(mock_request, mock_view) is True
        assert IsRestaurantStaff().has_permission(mock_request, mock_view) is True
        assert IsInventoryManager().has_permission(mock_request, mock_view) is True
        assert IsAccountant().has_permission(mock_request, mock_view) is True
        assert IsAnyStaff().has_permission(mock_request, mock_view) is True

    def test_front_desk_permissions(self, mock_request, mock_view, create_user):
        user = create_user("frontdesk@hotel.com", UserRole.FRONT_DESK)
        mock_request.user = user

        assert IsSuperAdmin().has_permission(mock_request, mock_view) is False
        assert IsPropertyManager().has_permission(mock_request, mock_view) is False
        assert IsFrontDesk().has_permission(mock_request, mock_view) is True
        assert IsHousekeeping().has_permission(mock_request, mock_view) is False
        assert IsRestaurantStaff().has_permission(mock_request, mock_view) is False
        assert IsInventoryManager().has_permission(mock_request, mock_view) is False
        assert IsAccountant().has_permission(mock_request, mock_view) is False
        assert IsAnyStaff().has_permission(mock_request, mock_view) is True

    def test_housekeeping_permissions(self, mock_request, mock_view, create_user):
        user = create_user("housekeeping@hotel.com", UserRole.HOUSEKEEPING)
        mock_request.user = user

        assert IsSuperAdmin().has_permission(mock_request, mock_view) is False
        assert IsPropertyManager().has_permission(mock_request, mock_view) is False
        assert IsFrontDesk().has_permission(mock_request, mock_view) is False
        assert IsHousekeeping().has_permission(mock_request, mock_view) is True
        assert IsRestaurantStaff().has_permission(mock_request, mock_view) is False
        assert IsInventoryManager().has_permission(mock_request, mock_view) is False
        assert IsAccountant().has_permission(mock_request, mock_view) is False
        assert IsAnyStaff().has_permission(mock_request, mock_view) is True

    def test_restaurant_staff_permissions(self, mock_request, mock_view, create_user):
        user = create_user("chef@hotel.com", UserRole.RESTAURANT_STAFF)
        mock_request.user = user

        assert IsSuperAdmin().has_permission(mock_request, mock_view) is False
        assert IsPropertyManager().has_permission(mock_request, mock_view) is False
        assert IsFrontDesk().has_permission(mock_request, mock_view) is False
        assert IsHousekeeping().has_permission(mock_request, mock_view) is False
        assert IsRestaurantStaff().has_permission(mock_request, mock_view) is True
        assert IsInventoryManager().has_permission(mock_request, mock_view) is False
        assert IsAccountant().has_permission(mock_request, mock_view) is False
        assert IsAnyStaff().has_permission(mock_request, mock_view) is True

    def test_inventory_manager_permissions(self, mock_request, mock_view, create_user):
        user = create_user("inv@hotel.com", UserRole.INVENTORY_MANAGER)
        mock_request.user = user

        assert IsSuperAdmin().has_permission(mock_request, mock_view) is False
        assert IsPropertyManager().has_permission(mock_request, mock_view) is False
        assert IsFrontDesk().has_permission(mock_request, mock_view) is False
        assert IsHousekeeping().has_permission(mock_request, mock_view) is False
        assert IsRestaurantStaff().has_permission(mock_request, mock_view) is False
        assert IsInventoryManager().has_permission(mock_request, mock_view) is True
        assert IsAccountant().has_permission(mock_request, mock_view) is False
        assert IsAnyStaff().has_permission(mock_request, mock_view) is True

    def test_accountant_permissions(self, mock_request, mock_view, create_user):
        user = create_user("bills@hotel.com", UserRole.ACCOUNTANT)
        mock_request.user = user

        assert IsSuperAdmin().has_permission(mock_request, mock_view) is False
        assert IsPropertyManager().has_permission(mock_request, mock_view) is False
        assert IsFrontDesk().has_permission(mock_request, mock_view) is False
        assert IsHousekeeping().has_permission(mock_request, mock_view) is False
        assert IsRestaurantStaff().has_permission(mock_request, mock_view) is False
        assert IsInventoryManager().has_permission(mock_request, mock_view) is False
        assert IsAccountant().has_permission(mock_request, mock_view) is True
        assert IsAnyStaff().has_permission(mock_request, mock_view) is True
