"""
SIA HMS — CRM Admin configuration
"""

from django.contrib import admin
from .models import GuestTag, GuestActivity, Campaign


@admin.register(GuestTag)
class GuestTagAdmin(admin.ModelAdmin):
    list_display = ("name", "color", "created_at")
    search_fields = ("name",)


@admin.register(GuestActivity)
class GuestActivityAdmin(admin.ModelAdmin):
    list_display = ("guest", "activity_type", "created_at")
    list_filter = ("activity_type", "created_at")
    search_fields = ("guest__first_name", "guest__last_name", "description")


@admin.register(Campaign)
class CampaignAdmin(admin.ModelAdmin):
    list_display = ("name", "campaign_type", "status", "scheduled_at", "created_at")
    list_filter = ("campaign_type", "status", "created_at")
    search_fields = ("name", "message_template")
