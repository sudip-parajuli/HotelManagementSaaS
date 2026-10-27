"""
SIA HMS — Tenant Models
Defines the Client (tenant), Domain, and BusinessType models for django-tenants.
Each hotel client gets their own PostgreSQL schema.
"""

from django.db import models
from django_tenants.models import TenantMixin, DomainMixin


class BusinessType(models.Model):
    """
    Represents a type of business that can use the platform.
    Each BusinessType has recommended modules for onboarding.
    """
    key = models.CharField(
        max_length=30, unique=True,
        choices=[
            ("hotel", "Hotel"),
            ("restaurant", "Restaurant"),
            ("gaming_cafe", "Gaming Cafe"),
            ("coworking", "Coworking Space"),
            ("spa_salon", "Spa & Salon"),
            ("retail", "Retail"),
            ("billiards", "Billiards / Pool Hall"),
            ("karaoke", "Karaoke"),
            ("parking", "Parking"),
            ("other", "Other"),
        ]
    )
    name = models.CharField(max_length=100)
    description = models.TextField(blank=True)
    icon_name = models.CharField(max_length=50, blank=True, default="")
    recommended_modules = models.ManyToManyField(
        "subscriptions.AddonModule", blank=True,
        help_text="Modules recommended for this business type during onboarding."
    )

    class Meta:
        verbose_name = "Business Type"
        verbose_name_plural = "Business Types"
        ordering = ["name"]

    def __str__(self):
        return self.name


class SubscriptionPlanChoice(models.TextChoices):
    STARTER = "starter", "Starter (NPR 3,000/mo)"
    PROFESSIONAL = "professional", "Professional (NPR 6,000/mo)"
    ENTERPRISE = "enterprise", "Enterprise (NPR 12,000/mo)"
    PRIVATE_INSTALL = "private_install", "Private Installation (One-time)"


class Client(TenantMixin):
    """
    Represents a single tenant (hotel, restaurant, gaming cafe, etc.).
    Each Client gets their own PostgreSQL schema (e.g., 'hotel_paraiso').
    """

    name = models.CharField(max_length=100, help_text="Business / property name")
    schema_name = models.CharField(max_length=63, unique=True)
    created_on = models.DateField(auto_now_add=True)
    is_active = models.BooleanField(default=True)

    # Contact info
    contact_email = models.EmailField()
    contact_phone = models.CharField(max_length=20, blank=True)

    # Business type
    business_type = models.ForeignKey(
        BusinessType,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        help_text="Type of business this tenant operates."
    )
    business_description = models.TextField(
        blank=True,
        help_text="Short description of the tenant's business."
    )

    # Subscription (legacy — kept for backward compat)
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
