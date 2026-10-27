"""
SIA HMS — SaaS Subscriptions Models
Defines the modular per-module pricing system.
SubscriptionPlan and TenantSubscription kept for backward compatibility only.
"""

from django.conf import settings
from django.db import models
from apps.tenants.models import Client


# ═══════════════════════════════════════════════════════════════════════════════
# LEGACY — kept for backward compatibility only
# ═══════════════════════════════════════════════════════════════════════════════

class SubscriptionPlan(models.Model):
    name = models.CharField(max_length=100)
    slug = models.SlugField(max_length=100, unique=True)
    price_monthly = models.DecimalField(max_digits=10, decimal_places=2)
    price_yearly = models.DecimalField(max_digits=10, decimal_places=2)
    max_rooms = models.PositiveIntegerField(default=10)
    max_staff_users = models.PositiveIntegerField(default=5)
    max_restaurants = models.PositiveIntegerField(default=1)
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
    """LEGACY — kept for backward compatibility. Feature gating now uses TenantModuleSubscription."""
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
    """LEGACY invoice — kept for backward compatibility."""
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


# ═══════════════════════════════════════════════════════════════════════════════
# MODULAR PER-MODULE PRICING SYSTEM
# ═══════════════════════════════════════════════════════════════════════════════

class ModuleCategory(models.TextChoices):
    UNIVERSAL = "universal", "Universal"
    HOSPITALITY = "hospitality", "Hospitality"
    FND = "fnd", "F&B"
    GAMING = "gaming", "Gaming"
    COWORKING = "coworking", "Coworking"
    WELLNESS = "wellness", "Wellness"


class ModuleBillingCycle(models.TextChoices):
    MONTHLY = "monthly", "Monthly"
    YEARLY = "yearly", "Yearly"


class TenantModuleSubscriptionStatus(models.TextChoices):
    ACTIVE = "active", "Active"
    CANCELLED = "cancelled", "Cancelled"
    TRIAL = "trial", "Trial"
    SUSPENDED = "suspended", "Suspended"


class AddonModule(models.Model):
    """
    Represents a purchasable add-on module in the SaaS marketplace.
    A tenant's features are determined by their active TenantModuleSubscription records.
    """
    key = models.SlugField(max_length=100, unique=True)
    name = models.CharField(max_length=100)
    description = models.TextField()
    category = models.CharField(
        max_length=30,
        choices=ModuleCategory.choices,
        default=ModuleCategory.UNIVERSAL
    )
    icon_name = models.CharField(
        max_length=50, blank=True, default="",
        help_text="Lucide icon name (e.g. 'Hotel', 'Utensils', 'Gamepad2')"
    )
    price_monthly = models.DecimalField(
        max_digits=10, decimal_places=2, null=True, blank=True,
        help_text="Monthly price in NPR per module. Null = free."
    )
    price_yearly = models.DecimalField(
        max_digits=10, decimal_places=2, null=True, blank=True,
        help_text="Annual price in NPR (pre-discounted). Null = same as monthly×12."
    )
    is_core = models.BooleanField(
        default=False,
        help_text="Core modules are always required (e.g. billing, analytics)."
    )
    depends_on = models.ManyToManyField(
        "self", symmetrical=False, blank=True,
        help_text="Modules this one depends on (e.g. 'pos' depends on 'billing')."
    )
    recommended_for = models.JSONField(
        default=list, blank=True,
        help_text="List of business_type keys this module is recommended for."
    )
    is_active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        verbose_name = "Add-on Module"
        verbose_name_plural = "Add-on Modules"
        ordering = ["category", "name"]

    def __str__(self):
        return f"{self.name} ({self.key})"


# ─── Tenant Module Subscription ───────────────────────────────────────────────

class TenantModuleSubscription(models.Model):
    """
    Links a tenant to an active module they've subscribed to.
    A tenant's features = all active TenantModuleSubscription records.
    Replaces the old plan-based TenantSubscription for feature gating.
    """
    tenant = models.ForeignKey(
        Client,
        on_delete=models.CASCADE,
        related_name="module_subscriptions"
    )
    module = models.ForeignKey(
        AddonModule,
        on_delete=models.PROTECT,
        related_name="tenant_subscriptions"
    )
    status = models.CharField(
        max_length=20,
        choices=TenantModuleSubscriptionStatus.choices,
        default=TenantModuleSubscriptionStatus.ACTIVE
    )
    billing_cycle = models.CharField(
        max_length=10,
        choices=ModuleBillingCycle.choices,
        default=ModuleBillingCycle.MONTHLY
    )
    price_at_activation = models.DecimalField(
        max_digits=10, decimal_places=2,
        help_text="Snapshot of the module price when activated."
    )
    activated_at = models.DateTimeField(auto_now_add=True)
    cancelled_at = models.DateTimeField(null=True, blank=True)
    next_billing_date = models.DateField(null=True, blank=True)
    trial_ends_at = models.DateTimeField(null=True, blank=True)

    class Meta:
        verbose_name = "Tenant Module Subscription"
        verbose_name_plural = "Tenant Module Subscriptions"
        unique_together = [("tenant", "module")]
        ordering = ["-activated_at"]

    def __str__(self):
        return f"{self.tenant.name} — {self.module.key} ({self.status})"


# ─── Modular Invoice ──────────────────────────────────────────────────────────

class ModuleInvoiceStatus(models.TextChoices):
    PENDING = "pending", "Pending"
    PAID = "paid", "Paid"
    FAILED = "failed", "Failed"


class ModuleInvoiceLineItem(models.Model):
    """
    Individual line item on a module-based invoice.
    """
    invoice = models.ForeignKey(
        "ModuleInvoice",
        on_delete=models.CASCADE,
        related_name="line_items"
    )
    module = models.ForeignKey(
        AddonModule,
        on_delete=models.PROTECT
    )
    module_name = models.CharField(max_length=100)
    billing_cycle = models.CharField(max_length=10, choices=ModuleBillingCycle.choices)
    amount = models.DecimalField(max_digits=10, decimal_places=2)

    class Meta:
        verbose_name = "Module Invoice Line Item"
        verbose_name_plural = "Module Invoice Line Items"

    def __str__(self):
        return f"{self.module_name} — Rs.{self.amount}"


class ModuleInvoice(models.Model):
    """
    Monthly invoice generated from active module subscriptions.
    """
    tenant = models.ForeignKey(
        Client,
        on_delete=models.CASCADE,
        related_name="module_invoices"
    )
    subtotal = models.DecimalField(max_digits=12, decimal_places=2)
    discounts = models.DecimalField(max_digits=10, decimal_places=2, default=0)
    total = models.DecimalField(max_digits=12, decimal_places=2)
    period_start = models.DateField()
    period_end = models.DateField()
    status = models.CharField(
        max_length=20,
        choices=ModuleInvoiceStatus.choices,
        default=ModuleInvoiceStatus.PENDING
    )
    paid_at = models.DateTimeField(null=True, blank=True)
    payment_ref = models.CharField(max_length=100, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        verbose_name = "Module Invoice"
        verbose_name_plural = "Module Invoices"
        ordering = ["-created_at"]

    def __str__(self):
        return f"ModuleInvoice {self.id} — {self.tenant.name} (Rs.{self.total} — {self.status})"


# ═══════════════════════════════════════════════════════════════════════════════
# LEGACY — Manual Feature Grants (kept for backward compatibility)
# ═══════════════════════════════════════════════════════════════════════════════

class TenantFeatureGrant(models.Model):
    """
    Allows a SuperAdmin to grant a specific feature to a tenant
    independently of their activated modules.
    Still works as an override for feature gating.
    """
    tenant = models.ForeignKey(
        Client,
        on_delete=models.CASCADE,
        related_name="feature_grants"
    )
    feature_key = models.CharField(
        max_length=100,
        help_text="Matches AddonModule.key"
    )
    granted_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="feature_grants_given"
    )
    granted_at = models.DateTimeField(auto_now_add=True)
    reason = models.TextField(blank=True)
    expires_at = models.DateField(
        null=True,
        blank=True,
        help_text="Optional: grant expires on this date. Null = permanent."
    )
    is_active = models.BooleanField(default=True)

    class Meta:
        verbose_name = "Tenant Feature Grant"
        verbose_name_plural = "Tenant Feature Grants"
        unique_together = [("tenant", "feature_key")]
        ordering = ["-granted_at"]

    def __str__(self):
        return f"{self.tenant.name} — {self.feature_key} (expires: {self.expires_at or 'never'})"

    def is_valid(self):
        """Returns True if grant is active and not expired."""
        from django.utils import timezone
        if not self.is_active:
            return False
        if self.expires_at and self.expires_at < timezone.localdate():
            return False
        return True


# ─── Add-on Requests ──────────────────────────────────────────────────────────

class AddonRequestStatus(models.TextChoices):
    PENDING = "pending", "Pending Review"
    APPROVED = "approved", "Approved"
    REJECTED = "rejected", "Rejected"
    ACTIVE = "active", "Active"


class AddonRequest(models.Model):
    """
    Tenant-initiated request for an add-on module.
    SuperAdmin reviews and approves/rejects.
    """
    tenant = models.ForeignKey(
        Client,
        on_delete=models.CASCADE,
        related_name="addon_requests"
    )
    addon = models.ForeignKey(
        AddonModule,
        on_delete=models.CASCADE,
        related_name="requests"
    )
    requested_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="addon_requests_made"
    )
    status = models.CharField(
        max_length=20,
        choices=AddonRequestStatus.choices,
        default=AddonRequestStatus.PENDING
    )
    message = models.TextField(blank=True, help_text="Tenant's message explaining why they need this add-on")
    rejection_reason = models.TextField(blank=True)
    reviewed_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="addon_requests_reviewed"
    )
    requested_at = models.DateTimeField(auto_now_add=True)
    reviewed_at = models.DateTimeField(null=True, blank=True)

    class Meta:
        verbose_name = "Add-on Request"
        verbose_name_plural = "Add-on Requests"
        ordering = ["-requested_at"]

    def __str__(self):
        return f"{self.tenant.name} → {self.addon.name} ({self.status})"

