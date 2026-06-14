"""
SIA HMS — Tenant Models
Defines the Client (tenant) and Domain models for django-tenants.
Each hotel client gets their own PostgreSQL schema.
"""

from django.db import models
from django_tenants.models import TenantMixin, DomainMixin


class SubscriptionPlanChoice(models.TextChoices):
    STARTER = "starter", "Starter (NPR 3,000/mo)"
    PROFESSIONAL = "professional", "Professional (NPR 6,000/mo)"
    ENTERPRISE = "enterprise", "Enterprise (NPR 12,000/mo)"
    PRIVATE_INSTALL = "private_install", "Private Installation (One-time)"


class Client(TenantMixin):
    """
    Represents a single hotel tenant.
    Each Client gets their own PostgreSQL schema (e.g., 'hotel_paraiso').
    """

    name = models.CharField(max_length=100, help_text="Hotel / property name")
    schema_name = models.CharField(max_length=63, unique=True)  # inherited + overridden
    created_on = models.DateField(auto_now_add=True)
    is_active = models.BooleanField(default=True)

    # Contact info
    contact_email = models.EmailField()
    contact_phone = models.CharField(max_length=20, blank=True)

    # Subscription
    subscription_plan = models.CharField(
        max_length=20,
        choices=SubscriptionPlanChoice.choices,
        default=SubscriptionPlanChoice.STARTER,
        blank=True,
    )

    # Metadata
    notes = models.TextField(blank=True)
    onboarded_at = models.DateTimeField(null=True, blank=True)

    # Auto-create schema when tenant is created
    auto_create_schema = True
    auto_drop_schema = False

    class Meta:
        verbose_name = "Client / Tenant"
        verbose_name_plural = "Clients / Tenants"

    def __str__(self):
        return f"{self.name} ({self.schema_name})"


class Domain(DomainMixin):
    """
    Maps subdomain → Client tenant.
    Examples:
        paraiso.siaenterprises.com.np  → hotel_paraiso schema
        himalayan.siaenterprises.com.np → himalayan_villa schema
    """

    tenant = models.ForeignKey(
        Client,
        on_delete=models.CASCADE,
        related_name="domains",
    )

    class Meta:
        verbose_name = "Domain"
        verbose_name_plural = "Domains"

    def __str__(self):
        return self.domain
