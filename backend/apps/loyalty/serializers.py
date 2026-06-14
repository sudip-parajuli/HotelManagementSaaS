"""
SIA HMS — Loyalty Serializers
Defines LoyaltyAccountSerializer and LoyaltyTransactionSerializer.
"""

from rest_framework import serializers
from apps.bookings.serializers import GuestProfileSerializer
from .models import LoyaltyAccount, LoyaltyTransaction


class LoyaltyTransactionSerializer(serializers.ModelSerializer):
    transaction_type_display = serializers.CharField(source="get_transaction_type_display", read_only=True)
    guest_name = serializers.CharField(source="account.guest.full_name", read_only=True)

    class Meta:
        model = LoyaltyTransaction
        fields = [
            "id",
            "account",
            "guest_name",
            "points",
            "transaction_type",
            "transaction_type_display",
            "description",
            "created_at",
        ]


class LoyaltyAccountSerializer(serializers.ModelSerializer):
    guest = GuestProfileSerializer(read_only=True)
    tier_display = serializers.CharField(source="get_tier_display", read_only=True)
    transactions = LoyaltyTransactionSerializer(many=True, read_only=True)

    class Meta:
        model = LoyaltyAccount
        fields = [
            "id",
            "guest",
            "points_balance",
            "tier",
            "tier_display",
            "tier_updated_at",
            "transactions",
            "created_at",
        ]
