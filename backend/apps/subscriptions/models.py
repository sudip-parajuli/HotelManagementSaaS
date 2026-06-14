"""
SIA HMS — SaaS Subscriptions Models
Defines SubscriptionPlan, TenantSubscription, and SubscriptionInvoice in the public schema.
"""

from django.db import models
from apps.tenants.models import Client


class SubscriptionPlan(models.Model):
    name = models.CharField(max_length=100)
    slug = models.SlugField(max_length=100, unique=True)
    price_monthly = models.DecimalField(max_digits=10, decimal_places=2)
    price_yearly = models.DecimalField(max_digits=10, decimal_places=2)
    
    # Limits
    max_rooms = models.PositiveIntegerField(default=10)
    max_staff_users = models.PositiveIntegerField(default=5)
    max_restaurants = models.PositiveIntegerField(default=1)
    
    # Features lists
    features = models.JSONField(default=list, help_text="List of feature keys enabled for this plan")
    
    is_active = models.BooleanField(default=True)
    is_public = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        verbose_name = "Subscription Plan"
        verbose_name_plural = "Subscription Plans"
        ordering = ["price_monthly"]

    def __str__(self):
        return f"{self.name} (Rs.{self.price_monthly}/mo)"


class SubscriptionStatus(models.TextChoices):
    TRIAL = "trial", "Trial"
    ACTIVE = "active", "Active"
    PAST_DUE = "past_due", "Past Due"
    CANCELLED = "cancelled", "Cancelled"
    SUSPENDED = "suspended", "Suspended"


class TenantSubscription(models.Model):
    tenant = models.OneToOneField(
        Client,
        on_delete=models.CASCADE,
        related_name="subscription"
    )
    plan = models.ForeignKey(
        SubscriptionPlan,
        on_delete=models.PROTECT,
        related_name="subscriptions"
    )
    status = models.CharField(
        max_length=20,
        choices=SubscriptionStatus.choices,
        default=SubscriptionStatus.TRIAL
    )
    
    trial_ends_at = models.DateField(null=True, blank=True)
    current_period_start = models.DateField()
    current_period_end = models.DateField()
    next_billing_date = models.DateField()
    cancelled_at = models.DateField(null=True, blank=True)
    
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        verbose_name = "Tenant Subscription"
        verbose_name_plural = "Tenant Subscriptions"

    def __str__(self):
        return f"{self.tenant.name} — {self.plan.name} ({self.status})"


class InvoiceStatus(models.TextChoices):
    PENDING = "pending", "Pending"
    PAID = "paid", "Paid"
    FAILED = "failed", "Failed"


class SubscriptionInvoice(models.Model):
    tenant = models.ForeignKey(
        Client,
        on_delete=models.CASCADE,
        related_name="subscription_invoices"
    )
    plan = models.ForeignKey(
        SubscriptionPlan,
        on_delete=models.PROTECT
    )
    amount = models.DecimalField(max_digits=10, decimal_places=2)
    period_start = models.DateField()
    period_end = models.DateField()
    status = models.CharField(
        max_length=20,
        choices=InvoiceStatus.choices,
        default=InvoiceStatus.PENDING
    )
    paid_at = models.DateTimeField(null=True, blank=True)
    payment_ref = models.CharField(max_length=100, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        verbose_name = "Subscription Invoice"
        verbose_name_plural = "Subscription Invoices"
        ordering = ["-created_at"]

    def __str__(self):
        return f"Invoice {self.id} — {self.tenant.name} (Rs.{self.amount} — {self.status})"
