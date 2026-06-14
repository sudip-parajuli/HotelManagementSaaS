"""
SIA HMS — HR App Admin Configuration
"""

from django.contrib import admin
from .models import Shift, Attendance, LeaveType, LeaveBalance, LeaveRequest


@admin.register(Shift)
class ShiftAdmin(admin.ModelAdmin):
    list_display = ("id", "staff", "date", "start_time", "end_time", "department", "is_confirmed")
    list_filter = ("date", "department", "is_confirmed")
    search_fields = ("staff__user__email",)


@admin.register(Attendance)
class AttendanceAdmin(admin.ModelAdmin):
    list_display = ("id", "staff", "date", "clock_in", "clock_out", "status", "overtime_hours")
    list_filter = ("status", "date")
    search_fields = ("staff__user__email",)


@admin.register(LeaveType)
class LeaveTypeAdmin(admin.ModelAdmin):
    list_display = ("id", "name", "days_per_year", "is_paid", "carry_forward_limit")
    search_fields = ("name",)


@admin.register(LeaveBalance)
class LeaveBalanceAdmin(admin.ModelAdmin):
    list_display = ("id", "staff", "leave_type", "year", "total", "used", "remaining")
    list_filter = ("year", "leave_type")
    search_fields = ("staff__user__email",)


@admin.register(LeaveRequest)
class LeaveRequestAdmin(admin.ModelAdmin):
    list_display = ("id", "staff", "leave_type", "start_date", "end_date", "days", "status")
    list_filter = ("status", "leave_type")
    search_fields = ("staff__user__email", "reason")
