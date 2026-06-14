"""
SIA HMS — Booking & Reservation Admin
"""

from django.contrib import admin
from .models import GuestProfile, Reservation, RatePlan


@admin.register(GuestProfile)
class GuestProfileAdmin(admin.ModelAdmin):
    list_display = ("full_name", "phone", "email", "nationality", "id_type", "is_blacklisted")
    list_filter = ("nationality", "id_type", "is_blacklisted")
    search_fields = ("first_name", "last_name", "phone", "email", "id_number")


@admin.register(Reservation)
class ReservationAdmin(admin.ModelAdmin):
    list_display = (
        "id",
        "guest",
        "room",
        "check_in_date",
        "check_out_date",
        "status",
        "booking_source",
        "total_amount",
        "deposit_paid",
    )
    list_filter = ("status", "booking_source", "deposit_paid", "check_in_date", "check_out_date")
    search_fields = (
        "id",
        "guest__first_name",
        "guest__last_name",
        "guest__phone",
        "room__room_number",
    )
    readonly_fields = ("total_nights", "base_amount", "tax_amount", "total_amount", "created_by")


@admin.register(RatePlan)
class RatePlanAdmin(admin.ModelAdmin):
    list_display = ("name", "room_type", "price_per_night", "valid_from", "valid_to", "is_active")
    list_filter = ("room_type__property", "room_type", "is_active")
    search_fields = ("name", "room_type__name")
