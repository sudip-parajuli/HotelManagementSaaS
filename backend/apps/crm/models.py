"""
SIA HMS — CRM Models
Defines GuestTag, GuestActivity, and Campaign.
"""

from django.db import models
from apps.bookings.models import GuestProfile


class GuestTag(models.Model):
    """
    Represents segmentation tags for guest profiles (e.g. VIP, Corporate, Blacklisted).
    """
    name = models.CharField(max_length=50, unique=True)
    color = models.CharField(max_length=15, default="#cbd5e0", help_text="Hex code color representation")
    guests = models.ManyToManyField(GuestProfile, blank=True, related_name="tags")
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        verbose_name = "Guest Tag"
        verbose_name_plural = "Guest Tags"
        ordering = ["name"]

    def __str__(self):
        return self.name


class GuestActivityChoices(models.TextChoices):
    BOOKING_CREATE = "booking_create", "Booking Created"
    CHECK_IN = "check_in", "Checked In"
    CHECK_OUT = "check_out", "Checked Out"
    PAYMENT = "payment", "Payment Logged"
    LOYALTY_EARN = "loyalty_earn", "Points Earned"
    LOYALTY_REDEEM = "loyalty_redeem", "Points Redeemed"
    PROFILE_UPDATE = "profile_update", "Profile Updated"


class GuestActivity(models.Model):
    """
    Represents historical actions or audit logs linked to a guest's profile.
    """
    guest = models.ForeignKey(
        GuestProfile,
        on_delete=models.CASCADE,
        related_name="activities",
    )
    activity_type = models.CharField(
        max_length=30,
        choices=GuestActivityChoices.choices,
    )
    description = models.TextField()
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        verbose_name = "Guest Activity"
        verbose_name_plural = "Guest Activities"
        ordering = ["-created_at"]

    def __str__(self):
        return f"{self.activity_type.upper()} for {self.guest.full_name} at {self.created_at}"


class CampaignType(models.TextChoices):
    BIRTHDAY = "birthday", "Birthday Campaign"
    ANNIVERSARY = "anniversary", "Anniversary Campaign"
    WINBACK = "winback", "Winback Offer"
    PROMOTION = "promotion", "Generic Promotional Offer"


class CampaignStatus(models.TextChoices):
    DRAFT = "draft", "Draft"
    QUEUED = "queued", "Queued"
    SENT = "sent", "Sent"


class Campaign(models.Model):
    """
    Represents an SMS marketing template targeted at specific guest groups.
    """
    name = models.CharField(max_length=150)
    campaign_type = models.CharField(
        max_length=30,
        choices=CampaignType.choices,
        default=CampaignType.PROMOTION,
    )
    message_template = models.TextField(help_text="SMS content template")
    scheduled_at = models.DateTimeField(null=True, blank=True)
    status = models.CharField(
        max_length=20,
        choices=CampaignStatus.choices,
        default=CampaignStatus.DRAFT,
    )
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        verbose_name = "Campaign"
        verbose_name_plural = "Campaigns"
        ordering = ["-created_at"]

    def __str__(self):
        return f"Campaign: {self.name} ({self.status})"
