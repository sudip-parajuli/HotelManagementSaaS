"""
SIA HMS — Billing App Serializers
Handles Invoice, InvoiceItem, and Payment serialization.
"""

from rest_framework import serializers
from django.contrib.auth import get_user_model
from django.db import transaction
from .models import Invoice, InvoiceItem, Payment

User = get_user_model()


class InvoiceItemSerializer(serializers.ModelSerializer):
    class Meta:
        model = InvoiceItem
        fields = ["id", "invoice", "description", "quantity", "unit_price", "amount", "item_type"]
        read_only_fields = ["id", "amount"]


class PaymentSerializer(serializers.ModelSerializer):
    received_by_name = serializers.CharField(source="received_by.get_full_name", read_only=True)

    class Meta:
        model = Payment
        fields = [
            "id",
            "invoice",
            "amount",
            "payment_method",
            "paid_at",
            "reference_number",
            "received_by",
            "received_by_name",
            "notes",
            "created_at",
        ]
        read_only_fields = ["id", "received_by", "created_at"]


class InvoiceSerializer(serializers.ModelSerializer):
    items = InvoiceItemSerializer(many=True, read_only=True)
    payments = PaymentSerializer(many=True, read_only=True)
    
    # Guest details if tied to reservation
    guest_name = serializers.CharField(source="reservation.guest.full_name", read_only=True)
    room_number = serializers.CharField(source="reservation.room.room_number", read_only=True)
    
    class Meta:
        model = Invoice
        fields = [
            "id",
            "invoice_number",
            "invoice_type",
            "reservation",
            "guest_name",
            "room_number",
            "walk_in_guest_name",
            "walk_in_guest_phone",
            "subtotal",
            "discount_amount",
            "service_charge_rate",
            "service_charge_amount",
            "tax_rate",
            "tax_amount",
            "total_amount",
            "paid_amount",
            "balance_due",
            "status",
            "is_irdbill",
            "fiscal_year",
            "notes",
            "items",
            "payments",
            "created_at",
            "updated_at",
        ]
        read_only_fields = [
            "id",
            "invoice_number",
            "subtotal",
            "service_charge_amount",
            "tax_amount",
            "total_amount",
            "paid_amount",
            "balance_due",
            "created_at",
            "updated_at",
        ]

    @transaction.atomic
    def create(self, validated_data):
        # We start by initializing invoice totals
        # Callers can add items later, or compute directly
        total = validated_data.get("total_amount", 0.00)
        invoice = Invoice.objects.create(
            total_amount=total,
            balance_due=total,
            **validated_data
        )
        return invoice
