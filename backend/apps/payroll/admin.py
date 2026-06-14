"""
SIA HMS — Payroll App Admin Configuration
"""

from django.contrib import admin
from .models import PayrollPeriod, PayrollEntry


@admin.register(PayrollPeriod)
class PayrollPeriodAdmin(admin.ModelAdmin):
    list_display = ("id", "month", "year", "status")
    list_filter = ("status", "year")


@admin.register(PayrollEntry)
class PayrollEntryAdmin(admin.ModelAdmin):
    list_display = ("id", "period", "staff", "basic_salary", "gross_salary", "total_deductions", "net_salary", "is_approved")
    list_filter = ("is_approved", "period")
    search_fields = ("staff__user__email",)
