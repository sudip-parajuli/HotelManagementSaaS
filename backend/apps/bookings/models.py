"""
SIA HMS — Booking & Reservation Models
Defines GuestProfile, Reservation, and RatePlan.
"""

from django.db import models
from django.conf import settings
from apps.properties.models import Room, RoomType


class GuestProfile(models.Model):
    """
    Represents a guest profile record. Shared across multiple bookings.
    Contains profile details, identification information, and blacklisting status.
    """

    class IDType(models.TextChoices):
        PASSPORT = "passport", "Passport"
        CITIZENSHIP = "citizenship", "Citizenship Card"
        DRIVING_LICENSE = "driving_license", "Driving License"
        OTHER = "other", "Other"

    first_name = models.CharField(max_length=100)
    last_name = models.CharField(max_length=100)
    email = models.EmailField(blank=True, null=True)
    phone = models.CharField(max_length=30)
    nationality = models.CharField(max_length=100, default="Nepalese")
    
    id_type = models.CharField(
        max_length=30,
        choices=IDType.choices,
        default=IDType.CITIZENSHIP,
    )
    id_number = models.CharField(max_length=100, blank=True)
    date_of_birth = models.DateField(null=True, blank=True)
    address = models.TextField(blank=True)
    
    notes = models.TextField(
        blank=True,
        help_text="General notes about guest behavior or requests",
    )
    dietary_restrictions = models.TextField(blank=True)
    preferences = models.TextField(blank=True)
    
    is_blacklisted = models.BooleanField(default=False)
    blacklist_reason = models.TextField(blank=True)

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        verbose_name = "Guest Profile"
        verbose_name_plural = "Guest Profiles"
        indexes = [
            models.Index(fields=["phone"]),
            models.Index(fields=["email"]),
        ]

    def __str__(self):
        return f"{self.first_name} {self.last_name} ({self.phone})"

    @property
    def full_name(self):
        return f"{self.first_name} {self.last_name}"


class ReservationStatus(models.TextChoices):
    PENDING = "pending", "Pending"
    CONFIRMED = "confirmed", "Confirmed"
    CHECKED_IN = "checked_in", "Checked In"
    CHECKED_OUT = "checked_out", "Checked Out"
    CANCELLED = "cancelled", "Cancelled"
    NO_SHOW = "no_show", "No Show"


class BookingSource(models.TextChoices):
    DIRECT = "direct", "Direct Staff Booking"
    PHONE = "phone", "Phone Reservation"
    WALK_IN = "walk_in", "Walk-in Guest"
    ONLINE = "online", "Online Website Direct"
    OTA_BOOKING = "ota_booking", "OTA Booking.com"
    OTA_AGODA = "ota_agoda", "OTA Agoda"
    OTA_EXPEDIA = "ota_expedia", "OTA Expedia"


class Reservation(models.Model):
    """
    Core reservation record mapping a guest to a room for a specific timeframe.
    """

    guest = models.ForeignKey(
        GuestProfile,
        on_delete=models.CASCADE,
        related_name="reservations",
    )
    room = models.ForeignKey(
        Room,
        on_delete=models.PROTECT,
        related_name="reservations",
    )
    
    check_in_date = models.DateField()
    check_out_date = models.DateField()
    
    adults = models.PositiveIntegerField(default=1)
    children = models.PositiveIntegerField(default=0)
    infants = models.PositiveIntegerField(default=0)
    
    status = models.CharField(
        max_length=25,
        choices=ReservationStatus.choices,
        default=ReservationStatus.PENDING,
    )
    booking_source = models.CharField(
        max_length=30,
        choices=BookingSource.choices,
        default=BookingSource.DIRECT,
    )

    total_nights = models.PositiveIntegerField()
    base_amount = models.DecimalField(max_digits=12, decimal_places=2)
    tax_amount = models.DecimalField(max_digits=12, decimal_places=2)
    discount_amount = models.DecimalField(max_digits=12, decimal_places=2, default=0.00)
    total_amount = models.DecimalField(max_digits=12, decimal_places=2)
    
    deposit_paid = models.BooleanField(default=False)
    deposit_amount = models.DecimalField(max_digits=12, decimal_places=2, default=0.00)
    
    special_requests = models.TextField(blank=True)
    internal_notes = models.TextField(blank=True)
    
    confirmed_at = models.DateTimeField(null=True, blank=True)
    cancelled_at = models.DateTimeField(null=True, blank=True)
    cancellation_reason = models.TextField(blank=True)

    created_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="created_reservations",
    )
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        verbose_name = "Reservation"
        verbose_name_plural = "Reservations"
        indexes = [
            models.Index(fields=["check_in_date", "check_out_date"]),
            models.Index(fields=["status"]),
        ]

    def __str__(self):
        return f"Booking {self.id} — Room {self.room.room_number} ({self.status})"


class RatePlan(models.Model):
    """
    Rate plans applicable to room types.
    Allows defining price per night for a given date range with conditional overrides.
    """

    room_type = models.ForeignKey(
        RoomType,
        on_delete=models.CASCADE,
        related_name="rate_plans",
    )
    name = models.CharField(max_length=100)
    price_per_night = models.DecimalField(max_digits=12, decimal_places=2)
    
    valid_from = models.DateField()
    valid_to = models.DateField()
    min_nights = models.PositiveIntegerField(default=1)
    
    is_active = models.BooleanField(default=True)

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        verbose_name = "Rate Plan"
        verbose_name_plural = "Rate Plans"
        ordering = ["valid_from"]

    def __str__(self):
        return f"{self.name} — Rs.{self.price_per_night}/night ({self.room_type.name})"
