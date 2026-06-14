"""
SIA HMS — Billing App Admin Configuration
"""

from django.contrib import admin
from .models import Invoice, InvoiceItem, Payment


class InvoiceItemInline(admin.TabularInline):
    model = InvoiceItem
    extra = 0


class PaymentInline(admin.TabularInline):
    model = Payment
    extra = 0
    raw_id_fields = ("received_by",)


@admin.register(Invoice)
class InvoiceAdmin(admin.ModelAdmin):
    list_display = ("invoice_number", "invoice_type", "reservation", "total_amount", "paid_amount", "balance_due", "status", "created_at")
    list_filter = ("status", "invoice_type", "is_irdbill")
    search_fields = ("invoice_number", "walk_in_guest_name", "walk_in_guest_phone")
    inlines = [InvoiceItemInline, PaymentInline]


@admin.register(InvoiceItem)
class InvoiceItemAdmin(admin.ModelAdmin):
    list_display = ("invoice", "description", "quantity", "unit_price", "amount", "item_type")
    list_filter = ("item_type",)
    search_fields = ("invoice__invoice_number", "description")


@admin.register(Payment)
class PaymentAdmin(admin.ModelAdmin):
    list_display = ("invoice", "amount", "payment_method", "paid_at", "reference_number", "received_by")
    list_filter = ("payment_method", "paid_at")
    search_fields = ("invoice__invoice_number", "reference_number")
    raw_id_fields = ("invoice", "received_by")
