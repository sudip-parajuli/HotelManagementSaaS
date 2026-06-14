"""
SIA HMS — Loyalty Models
"""

from django.db import models
from apps.bookings.models import GuestProfile


class LoyaltyTier(models.TextChoices):
    BRONZE = "bronze", "Bronze"
    SILVER = "silver", "Silver"
    GOLD = "gold", "Gold"
    PLATINUM = "platinum", "Platinum"


class LoyaltyAccount(models.Model):
    """
    Represents a guest's loyalty account tracking points and tier status.
    """
    guest = models.OneToOneField(
        GuestProfile,
        on_delete=models.CASCADE,
        related_name="loyalty_account",
    )
    points_balance = models.PositiveIntegerField(default=0)
    tier = models.CharField(
        max_length=20,
        choices=LoyaltyTier.choices,
        default=LoyaltyTier.BRONZE,
    )
    tier_updated_at = models.DateTimeField(auto_now=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        verbose_name = "Loyalty Account"
        verbose_name_plural = "Loyalty Accounts"

    def __str__(self):
        return f"Loyalty: {self.guest.full_name} ({self.points_balance} pts)"


class LoyaltyTransaction(models.Model):
    """
    Represents earn/redeem transaction logs of guest loyalty points.
    """
    class TransactionType(models.TextChoices):
        EARN = "earn", "Earn Points"
        REDEEM = "redeem", "Redeem Points"

    account = models.ForeignKey(
        LoyaltyAccount,
        on_delete=models.CASCADE,
        related_name="transactions",
    )
    points = models.IntegerField()
    transaction_type = models.CharField(
        max_length=20,
        choices=TransactionType.choices,
    )
    description = models.CharField(max_length=255, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        verbose_name = "Loyalty Transaction"
        verbose_name_plural = "Loyalty Transactions"
        ordering = ["-created_at"]

    def __str__(self):
        return f"{self.transaction_type.upper()}: {self.points} pts for {self.account.guest.full_name}"
