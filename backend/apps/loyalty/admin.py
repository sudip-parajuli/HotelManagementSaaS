"""
SIA HMS — Loyalty Admin configuration
"""

from django.contrib import admin
from .models import LoyaltyAccount, LoyaltyTransaction


@admin.register(LoyaltyAccount)
class LoyaltyAccountAdmin(admin.ModelAdmin):
    list_display = ("guest", "points_balance", "tier", "tier_updated_at")
    list_filter = ("tier", "created_at")
    search_fields = ("guest__first_name", "guest__last_name")


@admin.register(LoyaltyTransaction)
class LoyaltyTransactionAdmin(admin.ModelAdmin):
    list_display = ("account", "points", "transaction_type", "created_at")
    list_filter = ("transaction_type", "created_at")
    search_fields = ("account__guest__first_name", "account__guest__last_name", "description")
