"""
SIA HMS — Staff App Admin Configuration
"""

from django.contrib import admin
from .models import Department, StaffMember, StaffDocument


@admin.register(Department)
class DepartmentAdmin(admin.ModelAdmin):
    list_display = ("id", "name", "head")
    search_fields = ("name",)


@admin.register(StaffMember)
class StaffMemberAdmin(admin.ModelAdmin):
    list_display = ("id", "user", "department", "designation", "employment_type", "base_salary", "salary_type", "is_active")
    list_filter = ("department", "employment_type", "salary_type", "is_active")
    search_fields = ("user__email", "user__first_name", "user__last_name", "designation")
    raw_id_fields = ("user", "department", "head") if hasattr(StaffMember, "head") else ("user", "department")


@admin.register(StaffDocument)
class StaffDocumentAdmin(admin.ModelAdmin):
    list_display = ("id", "staff", "document_type", "expiry_date")
    list_filter = ("document_type",)
    search_fields = ("staff__user__email", "notes")
