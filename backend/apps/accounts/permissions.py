"""
SIA HMS — Role-Based Permission Classes
Each class checks request.user.role for access control.
"""

from rest_framework.permissions import BasePermission
from .models import UserRole


class IsSuperAdmin(BasePermission):
    """Only SIA Super Admins."""

    message = "Super Admin access required."

    def has_permission(self, request, view):
        return (
            request.user
            and request.user.is_authenticated
            and request.user.role == UserRole.SUPER_ADMIN
        )


class IsPropertyManager(BasePermission):
    """Property Managers and Super Admins."""

    message = "Property Manager access required."

    def has_permission(self, request, view):
        return (
            request.user
            and request.user.is_authenticated
            and request.user.role in (UserRole.SUPER_ADMIN, UserRole.PROPERTY_MANAGER)
        )


class IsFrontDesk(BasePermission):
    """Front Desk staff, Property Managers, and Super Admins."""

    message = "Front Desk access required."

    def has_permission(self, request, view):
        return (
            request.user
            and request.user.is_authenticated
            and request.user.role in (
                UserRole.SUPER_ADMIN,
                UserRole.PROPERTY_MANAGER,
                UserRole.FRONT_DESK,
            )
        )


class IsHousekeeping(BasePermission):
    """Housekeeping staff and above."""

    message = "Housekeeping access required."

    def has_permission(self, request, view):
        return (
            request.user
            and request.user.is_authenticated
            and request.user.role in (
                UserRole.SUPER_ADMIN,
                UserRole.PROPERTY_MANAGER,
                UserRole.HOUSEKEEPING,
            )
        )


class IsRestaurantStaff(BasePermission):
    """Restaurant staff and managers."""

    message = "Restaurant Staff access required."

    def has_permission(self, request, view):
        return (
            request.user
            and request.user.is_authenticated
            and request.user.role in (
                UserRole.SUPER_ADMIN,
                UserRole.PROPERTY_MANAGER,
                UserRole.RESTAURANT_STAFF,
            )
        )


class IsInventoryManager(BasePermission):
    """Inventory Managers and Property Managers."""

    message = "Inventory Manager access required."

    def has_permission(self, request, view):
        return (
            request.user
            and request.user.is_authenticated
            and request.user.role in (
                UserRole.SUPER_ADMIN,
                UserRole.PROPERTY_MANAGER,
                UserRole.INVENTORY_MANAGER,
            )
        )


class IsAccountant(BasePermission):
    """Accountants and Property Managers."""

    message = "Accountant access required."

    def has_permission(self, request, view):
        return (
            request.user
            and request.user.is_authenticated
            and request.user.role in (
                UserRole.SUPER_ADMIN,
                UserRole.PROPERTY_MANAGER,
                UserRole.ACCOUNTANT,
            )
        )


class IsAnyStaff(BasePermission):
    """Any authenticated staff member (any role)."""

    message = "Authentication required."

    def has_permission(self, request, view):
        return request.user and request.user.is_authenticated and bool(request.user.role)
