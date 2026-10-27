"""
SIA HMS — Timed Sessions Models
Core primitives for time-based service businesses:
gaming cafes, co-working spaces, spas, billiards, karaoke, etc.
"""

import uuid
from decimal import Decimal
from django.db import models
from django.conf import settings
from apps.properties.models import Property


# ─── Session Unit Type ───────────────────────────────────────────────────────

class PricingModel(models.TextChoices):
    PER_HOUR = "per_hour", "Per Hour"
    PER_MINUTE = "per_minute", "Per Minute"
    FLAT_RATE = "flat_rate", "Flat Rate"
    PER_DAY = "per_day", "Per Day"


class SessionUnitType(models.Model):
    """
    Defines a category/bookable type (e.g. PS5 Compartment, PC Station,
    Meeting Room, Massage Chair, Billiards Table).
    """
    property = models.ForeignKey(
        Property, on_delete=models.CASCADE, related_name="session_unit_types"
    )
    type_name = models.CharField(max_length=100)
    icon_name = models.CharField(max_length=50, blank=True, default="")
    pricing_model = models.CharField(
        max_length=20, choices=PricingModel.choices, default=PricingModel.PER_HOUR
    )
    rate = models.DecimalField(max_digits=10, decimal_places=2)
    minimum_duration_minutes = models.PositiveIntegerField(default=60)
    maximum_duration_minutes = models.PositiveIntegerField(null=True, blank=True)
    overage_rate = models.DecimalField(
        max_digits=10, decimal_places=2, null=True, blank=True,
        help_text="Rate per minute if session runs over paid time. Defaults to rate/60."
    )
    grace_period_minutes = models.PositiveIntegerField(default=5)
    requires_deposit = models.BooleanField(default=False)
    deposit_amount = models.DecimalField(max_digits=10, decimal_places=2, null=True, blank=True)
    is_active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        verbose_name = "Session Unit Type"
        verbose_name_plural = "Session Unit Types"
        unique_together = [("property", "type_name")]
        ordering = ["type_name"]

    def __str__(self):
        return f"{self.type_name}"


# ─── Session Unit ────────────────────────────────────────────────────────────

class SessionUnitStatus(models.TextChoices):
    AVAILABLE = "available", "Available"
    OCCUPIED = "occupied", "Occupied"
    RESERVED = "reserved", "Reserved"
    MAINTENANCE = "maintenance", "Maintenance"
    CLEANING = "cleaning", "Cleaning"


class SessionUnit(models.Model):
    """
    A specific physical unit that gets rented by time.
    e.g. "PS5 Booth #3", "Meeting Room A", "Table 7".
    """
    property = models.ForeignKey(
        Property, on_delete=models.CASCADE, related_name="session_units"
    )
    unit_type = models.ForeignKey(
        SessionUnitType, on_delete=models.CASCADE, related_name="units"
    )
    unit_name = models.CharField(max_length=100)
    status = models.CharField(
        max_length=20,
        choices=SessionUnitStatus.choices,
        default=SessionUnitStatus.AVAILABLE,
    )
    location_label = models.CharField(max_length=100, blank=True, help_text="Floor/zone description")
    position_x = models.DecimalField(max_digits=6, decimal_places=2, null=True, blank=True)
    position_y = models.DecimalField(max_digits=6, decimal_places=2, null=True, blank=True)
    qr_code = models.UUIDField(default=uuid.uuid4, unique=True, editable=False)
    notes = models.TextField(blank=True)
    is_active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        verbose_name = "Session Unit"
        verbose_name_plural = "Session Units"
        unique_together = [("property", "unit_name")]
        ordering = ["unit_name"]

    def __str__(self):
        return f"{self.unit_name} ({self.get_status_display()})"


# ─── Timed Session ───────────────────────────────────────────────────────────

class SessionStatus(models.TextChoices):
    PENDING = "pending", "Pending"
    ACTIVE = "active", "Active"
    PAUSED = "paused", "Paused"
    ENDED = "ended", "Ended"
    CANCELLED = "cancelled", "Cancelled"


class TimedSession(models.Model):
    """
    Represents a single timed rental session at a unit.
    Tracks time, billing, and links to POS orders and final invoice.
    """
    unit = models.ForeignKey(
        SessionUnit, on_delete=models.CASCADE, related_name="sessions"
    )
    guest = models.ForeignKey(
        "bookings.GuestProfile", on_delete=models.SET_NULL,
        null=True, blank=True, related_name="timed_sessions"
    )
    guest_name = models.CharField(max_length=100, blank=True, help_text="For anonymous walk-ins")
    guest_phone = models.CharField(max_length=30, blank=True)
    status = models.CharField(
        max_length=20, choices=SessionStatus.choices, default=SessionStatus.PENDING
    )

    # Time tracking
    scheduled_start = models.DateTimeField(null=True, blank=True)
    scheduled_end = models.DateTimeField(null=True, blank=True)
    actual_start = models.DateTimeField(null=True, blank=True)
    actual_end = models.DateTimeField(null=True, blank=True)
    paused_at = models.DateTimeField(null=True, blank=True)
    total_paused_minutes = models.PositiveIntegerField(default=0)

    # Billing
    paid_duration_minutes = models.PositiveIntegerField(
        default=0, help_text="Minutes paid for upfront"
    )
    total_active_minutes = models.PositiveIntegerField(
        default=0, help_text="Actual elapsed minutes minus pause"
    )
    base_amount = models.DecimalField(max_digits=10, decimal_places=2, default=Decimal("0.00"))
    overage_minutes = models.PositiveIntegerField(default=0)
    overage_amount = models.DecimalField(max_digits=10, decimal_places=2, default=Decimal("0.00"))
    total_amount = models.DecimalField(max_digits=10, decimal_places=2, default=Decimal("0.00"))
    is_settled = models.BooleanField(default=False)

    # Links
    pos_order = models.ForeignKey(
        "pos.Order", on_delete=models.SET_NULL,
        null=True, blank=True, related_name="timed_session"
    )
    invoice = models.ForeignKey(
        "billing.Invoice", on_delete=models.SET_NULL,
        null=True, blank=True, related_name="timed_session"
    )

    # Audit
    created_by = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.SET_NULL,
        null=True, blank=True, related_name="created_sessions"
    )
    last_expiry_warning_sent = models.DateTimeField(null=True, blank=True)
    notes = models.TextField(blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        verbose_name = "Timed Session"
        verbose_name_plural = "Timed Sessions"
        ordering = ["-created_at"]

    def __str__(self):
        guest = self.guest_name or str(self.guest) or "Anonymous"
        return f"{self.unit.unit_name} — {guest} ({self.get_status_display()})"


# ─── Session Extension ───────────────────────────────────────────────────────

class SessionExtension(models.Model):
    """
    Records each time a session was extended (additional time purchased).
    """
    session = models.ForeignKey(
        TimedSession, on_delete=models.CASCADE, related_name="extensions"
    )
    extended_by_minutes = models.PositiveIntegerField()
    additional_amount = models.DecimalField(max_digits=10, decimal_places=2)
    extended_by = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.SET_NULL,
        null=True, blank=True, related_name="session_extensions"
    )
    extended_at = models.DateTimeField(auto_now_add=True)
    payment_method = models.CharField(max_length=30, blank=True)
    notes = models.TextField(blank=True)

    class Meta:
        verbose_name = "Session Extension"
        verbose_name_plural = "Session Extensions"
        ordering = ["-extended_at"]

    def __str__(self):
        return f"+{self.extended_by_minutes} min for {self.session}"
