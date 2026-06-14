"""
SIA HMS — Billing Models
Defines Invoice, InvoiceItem, and Payment.
"""

import uuid
from decimal import Decimal
from django.db import models
from django.conf import settings
from django.utils import timezone
from apps.bookings.models import Reservation


class InvoiceStatus(models.TextChoices):
    DRAFT = "draft", "Draft"
    UNPAID = "unpaid", "Unpaid"
    PARTIALLY_PAID = "partially_paid", "Partially Paid"
    PAID = "paid", "Paid"
    VOIDED = "voided", "Voided"


class InvoiceType(models.TextChoices):
    HOTEL = "hotel", "Hotel Room Bill"
    RESTAURANT = "restaurant", "Restaurant Bill"
    MIXED = "mixed", "Mixed Bill"


class Invoice(models.Model):
    """
    Represents the billing invoice. Can be tied to a hotel stay reservation
    or direct restaurant/pos walk-ins.
    """
    invoice_number = models.CharField(max_length=50, unique=True)
    invoice_type = models.CharField(
        max_length=20,
        choices=InvoiceType.choices,
        default=InvoiceType.HOTEL,
    )
    reservation = models.ForeignKey(
        Reservation,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="invoices",
    )
    walk_in_guest_name = models.CharField(max_length=100, blank=True)
    walk_in_guest_phone = models.CharField(max_length=20, blank=True)
    
    # Financial details
    subtotal = models.DecimalField(max_digits=12, decimal_places=2, default=Decimal("0.00"))
    discount_amount = models.DecimalField(max_digits=12, decimal_places=2, default=Decimal("0.00"))
    
    # Nepal tax structures: Service charge (usually 10%) & VAT (usually 13%)
    service_charge_rate = models.DecimalField(max_digits=5, decimal_places=2, default=Decimal("10.00"))
    service_charge_amount = models.DecimalField(max_digits=12, decimal_places=2, default=Decimal("0.00"))
    tax_rate = models.DecimalField(max_digits=5, decimal_places=2, default=Decimal("13.00"))
    tax_amount = models.DecimalField(max_digits=12, decimal_places=2, default=Decimal("0.00"))
    
    total_amount = models.DecimalField(max_digits=12, decimal_places=2)
    paid_amount = models.DecimalField(max_digits=12, decimal_places=2, default=Decimal("0.00"))
    balance_due = models.DecimalField(max_digits=12, decimal_places=2, default=Decimal("0.00"))
    
    status = models.CharField(
        max_length=25,
        choices=InvoiceStatus.choices,
        default=InvoiceStatus.UNPAID,
    )
    is_irdbill = models.BooleanField(default=True)
    fiscal_year = models.CharField(max_length=15, default="2082/83")
    notes = models.TextField(blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        verbose_name = "Invoice"
        verbose_name_plural = "Invoices"
        ordering = ["-created_at"]
        indexes = [
            models.Index(fields=["status", "created_at"]),
            models.Index(fields=["invoice_number"]),
        ]

    def __str__(self):
        return f"Invoice {self.invoice_number} ({self.status})"

    def save(self, *args, **kwargs):
        if not self.invoice_number:
            # Generate a cleaner invoice sequence
            self.invoice_number = f"INV-2082-{uuid.uuid4().hex[:6].upper()}"
        
        # Ensure Decimal type for arithmetic operations
        from decimal import Decimal
        total = Decimal(str(self.total_amount)) if self.total_amount is not None else Decimal("0.00")
        paid = Decimal(str(self.paid_amount)) if self.paid_amount is not None else Decimal("0.00")
        
        self.total_amount = total
        self.paid_amount = paid
        # Balance calculation
        self.balance_due = total - paid
        super().save(*args, **kwargs)

    @property
    def due_amount(self):
        return self.balance_due

    @property
    def is_paid(self):
        return self.status == InvoiceStatus.PAID


class InvoiceItemType(models.TextChoices):
    ROOM_CHARGE = "room_charge", "Room Charge"
    POS_CHARGE = "pos_charge", "POS Charge"
    EXTRA_CHARGE = "extra_charge", "Extra Charge"
    DISCOUNT = "discount", "Discount"


class InvoiceItem(models.Model):
    """
    Represents an itemized line inside a billing invoice.
    """
    invoice = models.ForeignKey(
        Invoice,
        on_delete=models.CASCADE,
        related_name="items",
    )
    description = models.CharField(max_length=255)
    quantity = models.DecimalField(max_digits=10, decimal_places=2, default=Decimal("1.00"))
    unit_price = models.DecimalField(max_digits=12, decimal_places=2)
    amount = models.DecimalField(max_digits=12, decimal_places=2)
    item_type = models.CharField(
        max_length=30,
        choices=InvoiceItemType.choices,
        default=InvoiceItemType.ROOM_CHARGE,
    )

    class Meta:
        verbose_name = "Invoice Item"
        verbose_name_plural = "Invoice Items"

    def __str__(self):
        return f"{self.description} (x{self.quantity}) on {self.invoice.invoice_number}"

    def save(self, *args, **kwargs):
        self.amount = self.quantity * self.unit_price
        super().save(*args, **kwargs)


class PaymentMethod(models.TextChoices):
    CASH = "cash", "Cash"
    ESEWA = "esewa", "eSewa"
    KHALTI = "khalti", "Khalti"
    FONEPAY = "fonepay", "Fonepay QR"
    BANK_TRANSFER = "bank_transfer", "Bank Transfer"
    CREDIT = "credit", "Credit"


class Payment(models.Model):
    """
    Represents a payment record settling a specific invoice.
    """
    invoice = models.ForeignKey(
        Invoice,
        on_delete=models.CASCADE,
        related_name="payments",
    )
    amount = models.DecimalField(max_digits=12, decimal_places=2)
    payment_method = models.CharField(
        max_length=25,
        choices=PaymentMethod.choices,
        default=PaymentMethod.CASH,
    )
    paid_at = models.DateTimeField(default=timezone.now)
    reference_number = models.CharField(max_length=100, blank=True)
    received_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.PROTECT,
        related_name="collected_payments",
    )
    notes = models.TextField(blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        verbose_name = "Payment"
        verbose_name_plural = "Payments"
        ordering = ["-paid_at"]

    def __str__(self):
        return f"Payment of Rs. {self.amount} for {self.invoice.invoice_number} via {self.payment_method}"
