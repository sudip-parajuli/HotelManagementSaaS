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


class ClientSerializer(serializers.ModelSerializer):
    business_type_name = serializers.SerializerMethodField()
    business_type_key = serializers.SerializerMethodField()
    active_module_count = serializers.SerializerMethodField()

    def get_business_type_name(self, obj):
        return obj.business_type.name if obj.business_type else None

    def get_business_type_key(self, obj):
        return obj.business_type.key if obj.business_type else None

    class Meta:
        model = Client
        fields = [
            "id",
            "name",
            "schema_name",
            "created_on",
            "is_active",
            "contact_email",
            "contact_phone",
            "business_type",
            "business_type_name",
            "business_type_key",
            "business_description",
            "subscription_plan",
            "notes",
            "onboarded_at",
            "active_module_count",
        ]
        read_only_fields = ["id", "created_on", "onboarded_at", "active_module_count"]

    def get_active_module_count(self, obj):
        try:
            return obj.module_subscriptions.filter(
                status__in=["active", "granted"]
            ).count()
        except Exception:
            return 0


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


class TenantFeatureGrantSerializer(serializers.ModelSerializer):
    tenant_name = serializers.CharField(source="tenant.name", read_only=True)
    granted_by_name = serializers.CharField(source="granted_by.get_full_name", read_only=True)
    is_valid = serializers.SerializerMethodField()

    class Meta:
        model = None  # Set dynamically; avoids circular import at module load

        def bind_model():
            from apps.subscriptions.models import TenantFeatureGrant
            return TenantFeatureGrant

        fields = [
            "id",
            "tenant",
            "tenant_name",
            "feature_key",
            "granted_by",
            "granted_by_name",
            "granted_at",
            "reason",
            "expires_at",
            "is_active",
            "is_valid",
        ]
        read_only_fields = ["id", "granted_at", "tenant_name", "granted_by_name"]

    def get_is_valid(self, obj):
        return obj.is_valid()


class AddonModuleSerializer(serializers.ModelSerializer):
    depends_on_keys = serializers.SerializerMethodField()
    recommended_for = serializers.ListField(
        child=serializers.CharField(), required=False, default=list
    )

    class Meta:
        model = None  # resolved below via __init_subclass__
        fields = [
            "id",
            "key",
            "name",
            "description",
            "icon_name",
            "category",
            "price_monthly",
            "price_yearly",
            "is_core",
            "depends_on_keys",
            "recommended_for",
            "is_active",
            "created_at",
            "updated_at",
        ]
        read_only_fields = ["id", "created_at", "updated_at", "depends_on_keys"]

    def get_depends_on_keys(self, obj):
        return list(obj.depends_on.values_list("key", flat=True))

    def create(self, validated_data):
        recommended = validated_data.pop("recommended_for", [])
        instance = super().create(validated_data)
        if recommended:
            instance.recommended_for = recommended
            instance.save(update_fields=["recommended_for"])
        return instance

    def update(self, instance, validated_data):
        recommended = validated_data.pop("recommended_for", None)
        for attr, val in validated_data.items():
            setattr(instance, attr, val)
        if recommended is not None:
            instance.recommended_for = recommended
        instance.save()
        return instance


class AddonRequestSerializer(serializers.ModelSerializer):
    tenant_name = serializers.CharField(source="tenant.name", read_only=True)
    addon_name = serializers.CharField(source="addon.name", read_only=True)
    requested_by_name = serializers.CharField(source="requested_by.get_full_name", read_only=True)
    reviewed_by_name = serializers.CharField(source="reviewed_by.get_full_name", read_only=True)

    class Meta:
        model = None
        fields = [
            "id",
            "tenant",
            "tenant_name",
            "addon",
            "addon_name",
            "requested_by",
            "requested_by_name",
            "status",
            "message",
            "rejection_reason",
            "reviewed_by",
            "reviewed_by_name",
            "requested_at",
            "reviewed_at",
        ]
        read_only_fields = [
            "id", "requested_at", "reviewed_at",
            "tenant_name", "addon_name", "requested_by_name", "reviewed_by_name"
        ]


# Bind models lazily to avoid circular imports
def _bind_models():
    from apps.subscriptions.models import TenantFeatureGrant, AddonModule, AddonRequest
    TenantFeatureGrantSerializer.Meta.model = TenantFeatureGrant
    AddonModuleSerializer.Meta.model = AddonModule
    AddonRequestSerializer.Meta.model = AddonRequest

_bind_models()

