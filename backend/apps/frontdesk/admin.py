from django.contrib import admin
from .models import CheckIn, CheckOut


@admin.register(CheckIn)
class CheckInAdmin(admin.ModelAdmin):
    list_display = ["id", "reservation", "actual_checkin_time", "checked_in_by", "key_issued"]
    list_filter = ["actual_checkin_time"]
    search_fields = ["reservation__id", "reservation__guest__first_name", "reservation__guest__last_name", "key_issued"]


@admin.register(CheckOut)
class CheckOutAdmin(admin.ModelAdmin):
    list_display = ["id", "reservation", "actual_checkout_time", "checked_out_by", "final_amount", "payment_method"]
    list_filter = ["actual_checkout_time", "payment_method"]
    search_fields = ["reservation__id", "reservation__guest__first_name", "reservation__guest__last_name"]
