"""
SIA HMS — Public Subscriptions & Tenant Onboarding Views
Exposes unauthenticated endpoints for SaaS signups.
"""

import logging
import re
from datetime import timedelta
from django.utils import timezone
from django.db import connection
from django_tenants.utils import tenant_context

from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status
from rest_framework.permissions import AllowAny

from apps.accounts.models import User, UserRole
from apps.tenants.models import Client, Domain, BusinessType
from apps.subscriptions.models import SubscriptionPlan, TenantSubscription, SubscriptionStatus, AddonModule, TenantModuleSubscription, TenantModuleSubscriptionStatus, ModuleBillingCycle
from apps.properties.models import Property

logger = logging.getLogger(__name__)

class PublicTenantOnboardView(APIView):
    """
    POST /api/public/onboard/
    Allows prospective clients to register and spin up a new tenant schema.
    """
    permission_classes = [AllowAny]

    def post(self, request):
        name = request.data.get("name")
        schema_name = request.data.get("schema_name", "").lower().replace("-", "_")
        subdomain = request.data.get("subdomain", "").lower()
        admin_email = request.data.get("admin_email")
        admin_password = request.data.get("admin_password")
        business_type_key = request.data.get("business_type", "other")
        contact_phone = request.data.get("contact_phone", "")

        # Validation
        if not name or not schema_name or not subdomain or not admin_email or not admin_password:
            return Response(
                {"error": "name, schema_name, subdomain, admin_email, and admin_password are required fields."},
                status=status.HTTP_400_BAD_REQUEST
            )

        if not re.match(r"^[a-z][a-z0-9_]{2,62}$", schema_name):
            return Response(
                {"error": "Invalid schema_name. Must start with letter, lowercase alphanumeric and underscores, 3-63 chars."},
                status=status.HTTP_400_BAD_REQUEST
            )

        if Client.objects.filter(schema_name=schema_name).exists():
            return Response({"error": f"Schema name '{schema_name}' already exists."}, status=status.HTTP_400_BAD_REQUEST)

        # Base Domain Routing
        base_domain = getattr(connection, 'domain', 'localhost')
        if base_domain == 'localhost' or base_domain == '127.0.0.1':
            full_domain = f"{subdomain}.localhost"
        else:
            full_domain = f"{subdomain}.{base_domain}"

        if Domain.objects.filter(domain=full_domain).exists():
            return Response({"error": f"Subdomain '{full_domain}' is already in use."}, status=status.HTTP_400_BAD_REQUEST)

        # Lookup business type
        business_type = None
        if business_type_key:
            business_type = BusinessType.objects.filter(key=business_type_key).first()

        # Lookup plan (default to first active plan if none specified)
        plan_slug = request.data.get("plan_slug")
        plan = None
        if plan_slug:
            plan = SubscriptionPlan.objects.filter(slug=plan_slug, is_active=True).first()
        if not plan:
            plan = SubscriptionPlan.objects.filter(is_active=True).order_by("price_monthly").first()

        # Auto-create a default free plan if none exists (for fresh installations)
        if plan is None:
            plan, _ = SubscriptionPlan.objects.get_or_create(
                slug="free_trial",
                defaults={
                    "name": "Free Trial",
                    "price_monthly": 0,
                    "price_yearly": 0,
                    "max_rooms": 10,
                    "max_staff_users": 5,
                    "is_active": True,
                }
            )

        # Check if user already exists in shared schema to avoid conflict
        if User.objects.filter(email=admin_email).exists():
            return Response({"error": f"A user with email '{admin_email}' already exists. Please use a unique administrator email."}, status=status.HTTP_400_BAD_REQUEST)

        # Perform tenant onboarding
        # NOTE: transaction.atomic() is NOT used around schema creation because
        # django-tenants' auto_create_schema runs DDL (CREATE SCHEMA + migrations)
        # which is incompatible with Django's nested transaction management.
        # Schema creation happens in its own transaction; subsequent data ops
        # are individually committed.
        try:
            # 1. Create Tenant (Client) -> Runs migrations automatically
            tenant = Client.objects.create(
                schema_name=schema_name,
                name=name,
                contact_email=admin_email,
                contact_phone=contact_phone,
                business_type=business_type,
                is_active=True
            )

            # 2. Create Domain
            Domain.objects.create(
                domain=full_domain,
                tenant=tenant,
                is_primary=True
            )

            # 3. Create Tenant Subscription (default trial)
            today = timezone.localdate()
            TenantSubscription.objects.create(
                tenant=tenant,
                plan=plan,
                status=SubscriptionStatus.TRIAL,
                trial_ends_at=today + timedelta(days=14),
                current_period_start=today,
                current_period_end=today + timedelta(days=30),
                next_billing_date=today + timedelta(days=14)
            )

            # 4. Activate modules for the tenant
            module_keys = request.data.get("modules")
            billing_cycle_value = request.data.get("billing_cycle", ModuleBillingCycle.MONTHLY)
            if billing_cycle_value == "yearly":
                billing_cycle = ModuleBillingCycle.YEARLY
            else:
                billing_cycle = ModuleBillingCycle.MONTHLY

            if module_keys:
                modules_to_activate = AddonModule.objects.filter(key__in=module_keys, is_active=True)
            else:
                core_mods = AddonModule.objects.filter(is_core=True, is_active=True)
                if business_type:
                    recommended = AddonModule.objects.filter(
                        is_active=True,
                        recommended_for__contains=business_type.key
                    )
                    modules_to_activate = list(core_mods) + list(recommended)
                else:
                    modules_to_activate = list(core_mods)

            for module in modules_to_activate:
                price = module.price_monthly or 0
                if billing_cycle == ModuleBillingCycle.YEARLY and module.price_yearly:
                    price = module.price_yearly
                TenantModuleSubscription.objects.get_or_create(
                    tenant=tenant,
                    module=module,
                    defaults={
                        "status": TenantModuleSubscriptionStatus.ACTIVE,
                        "billing_cycle": billing_cycle,
                        "price_at_activation": price,
                        "next_billing_date": today + timedelta(days=30),
                    }
                )

            # 5. Create Tenant superuser inside its schema context
            with tenant_context(tenant):
                User.objects.create_superuser(
                    email=admin_email,
                    username=admin_email,
                    password=admin_password,
                    role=UserRole.PROPERTY_MANAGER,
                    is_active=True
                )

                # Create default Property inside tenant schema context
                Property.objects.create(
                    name=name,
                    address="Kathmandu, Nepal",
                    city="Kathmandu",
                    phone=contact_phone or "9800000000",
                    email=admin_email
                )

            tenant.onboarded_at = timezone.now()
            tenant.save()

            return Response({
                "message": "Tenant onboarded successfully!",
                "id": tenant.id,
                "name": tenant.name,
                "schema_name": tenant.schema_name,
                "domain": full_domain,
                "business_type": business_type.key if business_type else None,
                "plan": plan.name if plan else "Trial",
                "onboarded_at": tenant.onboarded_at
            }, status=status.HTTP_201_CREATED)

        except Exception as e:
            logger.exception("Failed to onboard tenant '%s' (schema=%s)", name, schema_name)
            return Response({"error": f"Failed to onboard tenant: {str(e)}"}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
