"""
SIA HMS — Payment Integration Models
Defines PaymentTransaction tracking gateway sessions.
"""

from django.db import models
from apps.billing.models import Invoice


class PaymentTransaction(models.Model):
    """
    Represents a payment gateway transaction session (eSewa, Khalti, or Fonepay).
    """
    class GatewayChoices(models.TextChoices):
        ESEWA = "esewa", "eSewa"
        KHALTI = "khalti", "Khalti"
        FONEPAY = "fonepay", "Fonepay"

    class StatusChoices(models.TextChoices):
        PENDING = "pending", "Pending"
        SUCCESS = "success", "Success"
        FAILED = "failed", "Failed"

    invoice = models.ForeignKey(
        Invoice,
        on_delete=models.CASCADE,
        related_name="transactions",
    )
    gateway = models.CharField(
        max_length=20,
        choices=GatewayChoices.choices,
    )
    amount = models.DecimalField(max_digits=12, decimal_places=2)
    status = models.CharField(
        max_length=20,
        choices=StatusChoices.choices,
        default=StatusChoices.PENDING,
    )
    gateway_ref = models.CharField(max_length=100, blank=True)
    raw_response = models.JSONField(default=dict, blank=True)
    
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        verbose_name = "Payment Transaction"
        verbose_name_plural = "Payment Transactions"
        ordering = ["-created_at"]

    def __str__(self):
        return f"{self.gateway.upper()} Transaction: Rs. {self.amount} for {self.invoice.invoice_number} ({self.status})"
