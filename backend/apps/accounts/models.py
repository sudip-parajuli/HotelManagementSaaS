"""
SIA HMS — Custom User Model
Extends AbstractUser with HMS-specific fields: role, phone, avatar.
"""

from django.contrib.auth.models import AbstractUser
from django.db import models


class UserRole(models.TextChoices):
    SUPER_ADMIN = "SUPER_ADMIN", "Super Admin (SIA)"
    PROPERTY_MANAGER = "PROPERTY_MANAGER", "Property Manager"
    FRONT_DESK = "FRONT_DESK", "Front Desk"
    HOUSEKEEPING = "HOUSEKEEPING", "Housekeeping"
    RESTAURANT_STAFF = "RESTAURANT_STAFF", "Restaurant Staff"
    INVENTORY_MANAGER = "INVENTORY_MANAGER", "Inventory Manager"
    ACCOUNTANT = "ACCOUNTANT", "Accountant"


class User(AbstractUser):
    """
    Custom User model for SIA HMS.
    Uses email as the primary identifier in addition to username.
    Includes HMS-specific role for RBAC.
    """

    # Use email as primary login (username is kept for AbstractUser compatibility)
    email = models.EmailField(unique=True)

    # HMS-specific fields
    phone = models.CharField(max_length=20, blank=True)
    avatar = models.ImageField(
        upload_to="avatars/",
        null=True,
        blank=True,
        help_text="Profile photo stored in MinIO",
    )
    role = models.CharField(
        max_length=25,
        choices=UserRole.choices,
        default=UserRole.FRONT_DESK,
    )
    is_active = models.BooleanField(default=True)

    # Timestamps (AbstractUser has last_login; we add updated_at)
    updated_at = models.DateTimeField(auto_now=True)

    # Auth backend configuration
    USERNAME_FIELD = "email"
    REQUIRED_FIELDS = ["username", "first_name", "last_name"]

    class Meta:
        verbose_name = "User"
        verbose_name_plural = "Users"
        indexes = [
            models.Index(fields=["email"]),
            models.Index(fields=["role"]),
        ]

    def __str__(self):
        return f"{self.get_full_name()} ({self.email}) — {self.role}"

    @property
    def full_name(self):
        return self.get_full_name() or self.email

    @property
    def is_super_admin(self):
        return self.role == UserRole.SUPER_ADMIN

    @property
    def is_property_manager(self):
        return self.role in (UserRole.SUPER_ADMIN, UserRole.PROPERTY_MANAGER)

    @property
    def is_front_desk(self):
        return self.role in (
            UserRole.SUPER_ADMIN,
            UserRole.PROPERTY_MANAGER,
            UserRole.FRONT_DESK,
        )
