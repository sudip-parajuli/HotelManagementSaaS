"""
SIA HMS — Tenant-Facing Module API Views
Endpoints for tenants to browse modules, manage subscriptions, and onboard.
"""

from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status
from rest_framework.permissions import IsAuthenticated
from django.utils import timezone
from decimal import Decimal

from apps.tenants.models import Client, BusinessType
from apps.subscriptions.models import (
    AddonModule, TenantModuleSubscription,
    TenantModuleSubscriptionStatus, ModuleBillingCycle,
)
from apps.subscriptions.serializers import AddonModuleSerializer


class ModuleCatalogView(APIView):
    """
    GET /api/modules/
    List all active modules.
    """
    permission_classes = [IsAuthenticated]

    def get(self, request):
        modules = AddonModule.objects.filter(is_active=True)
        serializer = AddonModuleSerializer(modules, many=True)
        data = serializer.data
        # Include yearly price and depends_on in response
        for m in modules:
            for item in data:
                if item["id"] == m.id:
                    item["price_yearly"] = str(m.price_yearly) if m.price_yearly else None
                    item["price_monthly"] = str(m.price_monthly) if m.price_monthly else None
                    item["icon_name"] = m.icon_name
                    item["category"] = m.category
                    item["is_core"] = m.is_core
                    item["depends_on"] = list(m.depends_on.values_list("key", flat=True))
                    item["recommended_for"] = m.recommended_for
                    break
        return Response(data)


class BusinessTypeListView(APIView):
    """
    GET /api/modules/business-types/
    List all business types with their recommended module keys.
    """
    permission_classes = [IsAuthenticated]

    def get(self, request):
        types = BusinessType.objects.all().prefetch_related("recommended_modules")
        data = []
        for bt in types:
            data.append({
                "key": bt.key,
                "name": bt.name,
                "description": bt.description,
                "icon_name": bt.icon_name,
                "recommended_modules": list(
                    bt.recommended_modules.values_list("key", flat=True)
                ),
            })
        return Response(data)


class TenantInfoView(APIView):
    """
    GET /api/modules/tenant/
    PATCH /api/modules/tenant/
    Get or update the current tenant's business_type and info.
    """
    permission_classes = [IsAuthenticated]

    def get(self, request):
        tenant = getattr(request, "tenant", None)
        if not tenant:
            return Response({"error": "No tenant context"}, status=400)
        bt = tenant.business_type
        # Get active module keys
        active_modules = list(
            TenantModuleSubscription.objects
            .filter(tenant=tenant, status=TenantModuleSubscriptionStatus.ACTIVE)
            .values_list("module__key", flat=True)
        )
        # Get all module subscriptions with status
        all_subs = TenantModuleSubscription.objects.filter(tenant=tenant)
        subscriptions = []
        for sub in all_subs:
            subscriptions.append({
                "module_key": sub.module.key,
                "module_name": sub.module.name,
                "status": sub.status,
                "billing_cycle": sub.billing_cycle,
                "price": str(sub.price_at_activation),
                "activated_at": sub.activated_at.isoformat() if sub.activated_at else None,
            })
        # Current billing summary
        monthly_total = Decimal("0")
        for sub in all_subs.filter(status=TenantModuleSubscriptionStatus.ACTIVE):
            if sub.billing_cycle == ModuleBillingCycle.YEARLY:
                monthly_total += sub.price_at_activation / Decimal("12")
            else:
                monthly_total += sub.price_at_activation
        return Response({
            "id": tenant.id,
            "name": tenant.name,
            "schema_name": tenant.schema_name,
            "business_type": bt.key if bt else None,
            "business_type_name": bt.name if bt else None,
            "business_description": tenant.business_description,
            "contact_email": tenant.contact_email,
            "contact_phone": tenant.contact_phone,
            "is_active": tenant.is_active,
            "onboarded_at": tenant.onboarded_at.isoformat() if tenant.onboarded_at else None,
            "active_modules": active_modules,
            "subscriptions": subscriptions,
            "monthly_total": str(monthly_total),
        })

    def patch(self, request):
        tenant = getattr(request, "tenant", None)
        if not tenant:
            return Response({"error": "No tenant context"}, status=400)
        bt_key = request.data.get("business_type")
        if bt_key:
            bt = BusinessType.objects.filter(key=bt_key).first()
            if not bt:
                return Response({"error": f"Invalid business_type: {bt_key}"}, status=400)
            tenant.business_type = bt
        desc = request.data.get("business_description")
        if desc is not None:
            tenant.business_description = desc
        tenant.save(update_fields=["business_type", "business_description"] if desc is not None else ["business_type"])
        return Response({
            "message": "Tenant updated",
            "business_type": tenant.business_type.key if tenant.business_type else None,
            "business_description": tenant.business_description,
        })


class ActivateModulesView(APIView):
    """
    POST /api/modules/activate/
    Activate selected modules for the current tenant.
    Expects: { "modules": ["key1", "key2"], "billing_cycle": "monthly" }
    """
    permission_classes = [IsAuthenticated]

    def post(self, request):
        tenant = getattr(request, "tenant", None)
        if not tenant:
            return Response({"error": "No tenant context"}, status=400)

        module_keys = request.data.get("modules", [])
        billing_cycle = request.data.get("billing_cycle", ModuleBillingCycle.MONTHLY)

        if not module_keys:
            return Response({"error": "No modules specified"}, status=400)

        modules = AddonModule.objects.filter(key__in=module_keys, is_active=True)
        if modules.count() != len(module_keys):
            found = set(modules.values_list("key", flat=True))
            missing = set(module_keys) - found
            return Response(
                {"error": f"Modules not found or inactive: {', '.join(missing)}"},
                status=400,
            )

        # Validate dependencies before activating
        for module in modules:
            deps = module.depends_on.all()
            if deps.exists():
                dep_keys = set(deps.values_list("key", flat=True))
                # Check tenant has ACTIVE subscriptions for all dependencies
                active_keys = set(
                    TenantModuleSubscription.objects.filter(
                        tenant=tenant,
                        module__key__in=dep_keys,
                        status=TenantModuleSubscriptionStatus.ACTIVE,
                    ).values_list("module__key", flat=True)
                )
                # Also check newly activated modules in this batch
                new_keys = {m.key for m in modules}
                combined = active_keys | (new_keys & dep_keys)
                missing = dep_keys - combined
                if missing:
                    return Response(
                        {
                            "error": "dependency_not_met",
                            "module": module.key,
                            "requires": sorted(missing),
                        },
                        status=400,
                    )

        activated = []
        for module in modules:
            price = module.price_monthly or Decimal("0")
            sub, created = TenantModuleSubscription.objects.update_or_create(
                tenant=tenant,
                module=module,
                defaults={
                    "status": TenantModuleSubscriptionStatus.ACTIVE,
                    "billing_cycle": billing_cycle,
                    "price_at_activation": price,
                    "next_billing_date": timezone.localdate(),
                },
            )
            activated.append({
                "key": module.key,
                "name": module.name,
                "status": sub.status,
                "created": created,
            })

        return Response({
            "message": f"{len(activated)} module(s) activated",
            "activated": activated,
        })


class DeactivateModuleView(APIView):
    """
    POST /api/modules/deactivate/
    Deactivate (cancel) a module subscription.
    Expects: { "module_key": "key" }
    """
    permission_classes = [IsAuthenticated]

    def post(self, request):
        tenant = getattr(request, "tenant", None)
        if not tenant:
            return Response({"error": "No tenant context"}, status=400)

        module_key = request.data.get("module_key")
        if not module_key:
            return Response({"error": "module_key is required"}, status=400)

        sub = TenantModuleSubscription.objects.filter(
            tenant=tenant,
            module__key=module_key,
            status=TenantModuleSubscriptionStatus.ACTIVE,
        ).first()
        if not sub:
            return Response({"error": f"No active subscription for '{module_key}'"}, status=404)

        sub.status = TenantModuleSubscriptionStatus.CANCELLED
        sub.cancelled_at = timezone.now()
        sub.save(update_fields=["status", "cancelled_at"])
        return Response({"message": f"Module '{module_key}' deactivated"})
