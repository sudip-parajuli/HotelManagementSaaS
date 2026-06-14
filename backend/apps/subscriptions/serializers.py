"""
SIA HMS — Subscriptions Serializers
"""

from rest_framework import serializers
from apps.tenants.models import Client
from apps.subscriptions.models import SubscriptionPlan, TenantSubscription, SubscriptionInvoice

class SubscriptionPlanSerializer(serializers.ModelSerializer):
    class Meta:
        model = SubscriptionPlan
        fields = "__all__"
        read_only_fields = ["id", "created_at", "updated_at"]


class TenantSubscriptionSerializer(serializers.ModelSerializer):
    plan_details = SubscriptionPlanSerializer(source="plan", read_only=True)
    tenant_name = serializers.CharField(source="tenant.name", read_only=True)

    class Meta:
        model = TenantSubscription
        fields = [
            "id",
            "tenant",
            "tenant_name",
            "plan",
            "plan_details",
            "status",
            "trial_ends_at",
            "current_period_start",
            "current_period_end",
            "next_billing_date",
            "cancelled_at",
            "created_at",
            "updated_at"
        ]
        read_only_fields = ["id", "created_at", "updated_at", "tenant_name"]


class SubscriptionInvoiceSerializer(serializers.ModelSerializer):
    plan_name = serializers.CharField(source="plan.name", read_only=True)
    tenant_name = serializers.CharField(source="tenant.name", read_only=True)

    class Meta:
        model = SubscriptionInvoice
        fields = [
            "id",
            "tenant",
            "tenant_name",
            "plan",
            "plan_name",
            "amount",
            "period_start",
            "period_end",
            "status",
            "paid_at",
            "payment_ref",
            "created_at"
        ]
        read_only_fields = ["id", "created_at", "tenant_name", "plan_name"]
