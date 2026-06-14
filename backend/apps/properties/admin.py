"""
SIA HMS — Property & Room Admin
"""

from django.contrib import admin
from .models import Property, Amenity, RoomType, Room, RoomImage


@admin.register(Property)
class PropertyAdmin(admin.ModelAdmin):
    list_display = ("name", "city", "country", "phone", "email", "vat_number", "pan_number")
    search_fields = ("name", "city", "address", "vat_number", "pan_number")


@admin.register(Amenity)
class AmenityAdmin(admin.ModelAdmin):
    list_display = ("name", "icon", "category")
    list_filter = ("category",)
    search_fields = ("name",)


class RoomImageInline(admin.TabularInline):
    model = RoomImage
    extra = 1


@admin.register(RoomType)
class RoomTypeAdmin(admin.ModelAdmin):
    list_display = ("name", "property", "base_price_per_night", "weekend_price", "max_occupancy", "is_active", "display_order")
    list_filter = ("property", "is_active", "max_occupancy")
    search_fields = ("name", "description")
    inlines = [RoomImageInline]
    prepopulated_fields = {"slug": ("name",)}


@admin.register(Room)
class RoomAdmin(admin.ModelAdmin):
    list_display = ("room_number", "room_type", "floor", "status", "is_active", "last_cleaned_at")
    list_filter = ("room_type__property", "room_type", "status", "floor", "is_active")
    search_fields = ("room_number", "notes")
    readonly_fields = ("last_cleaned_at",)
