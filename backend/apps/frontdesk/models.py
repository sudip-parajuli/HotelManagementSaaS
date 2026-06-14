"""
SIA HMS — Front Desk Operations Models
Defines CheckIn and CheckOut.
"""

from django.db import models
from django.conf import settings
from apps.bookings.models import Reservation


class CheckIn(models.Model):
    """
    Represents an active check-in transaction associated with a reservation.
    """
    reservation = models.OneToOneField(
        Reservation,
        on_delete=models.CASCADE,
        related_name="check_in_record",
    )
    actual_checkin_time = models.DateTimeField(auto_now_add=True)
    checked_in_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="checked_in_guests",
    )
    id_document_image = models.CharField(
        max_length=255,
        blank=True,
        help_text="Path to uploaded guest ID document in MinIO",
    )
    key_issued = models.CharField(
        max_length=50,
        blank=True,
        help_text="Physical room key/card identifier issued to guest",
    )
    locker_number = models.CharField(max_length=50, blank=True)
    notes = models.TextField(blank=True)

    class Meta:
        verbose_name = "Check In"
        verbose_name_plural = "Check Ins"

    def __str__(self):
        return f"Check-In for Reservation {self.reservation.id} (Room {self.reservation.room.room_number})"


class CheckOut(models.Model):
    """
    Represents a check-out transaction logging final payments and stay ratings.
    """
    class PaymentMethodChoices(models.TextChoices):
        CASH = "cash", "Cash"
        CARD = "card", "Credit/Debit Card"
        ESEWA = "esewa", "eSewa"
        KHALTI = "khalti", "Khalti"
        FONEPAY = "fonepay", "Fonepay"
        BANK_TRANSFER = "bank_transfer", "Bank Transfer"

    reservation = models.OneToOneField(
        Reservation,
        on_delete=models.CASCADE,
        related_name="check_out_record",
    )
    actual_checkout_time = models.DateTimeField(auto_now_add=True)
    checked_out_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="checked_out_guests",
    )
    final_amount = models.DecimalField(max_digits=12, decimal_places=2)
    additional_charges = models.JSONField(
        default=list,
        blank=True,
        help_text="Custom list of [{description, amount}] charges appended at checkout",
    )
    payment_method = models.CharField(
        max_length=30,
        choices=PaymentMethodChoices.choices,
        default=PaymentMethodChoices.CASH,
    )
    feedback_rating = models.PositiveIntegerField(null=True, blank=True)
    feedback_comment = models.TextField(blank=True)

    class Meta:
        verbose_name = "Check Out"
        verbose_name_plural = "Check Outs"

    def __str__(self):
        return f"Check-Out for Reservation {self.reservation.id} (Room {self.reservation.room.room_number})"
