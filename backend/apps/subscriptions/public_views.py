"""
SIA HMS — Public Subscriptions & Tenant Onboarding Views
Exposes unauthenticated endpoints for SaaS signups.
"""

import re
from datetime import timedelta
from django.utils import timezone
from django.db import connection, transaction
from django_tenants.utils import tenant_context

from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status
from rest_framework.permissions import AllowAny

from apps.accounts.models import User, UserRole
from apps.tenants.models import Client, Domain
from apps.subscriptions.models import SubscriptionPlan, TenantSubscription, SubscriptionStatus
from apps.properties.models import Property

class PublicTenantOnboardView(APIView):
    """
    POST /api/public/onboard/
    Allows prospective hotel clients to register and spin up a new tenant schema.
    """
    permission_classes = [AllowAny]

    def post(self, request):
        name = request.data.get("name")
        schema_name = request.data.get("schema_name", "").lower().replace("-", "_")
        subdomain = request.data.get("subdomain", "").lower()
        admin_email = request.data.get("admin_email")
        admin_password = request.data.get("admin_password")
        plan_slug = request.data.get("plan_slug", "starter")
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

        plan = SubscriptionPlan.objects.filter(slug=plan_slug, is_active=True).first()
        if not plan:
            return Response({"error": f"Active subscription plan with slug '{plan_slug}' not found."}, status=status.HTTP_400_BAD_REQUEST)

        # Check if user already exists in shared schema to avoid conflict
        if User.objects.filter(email=admin_email).exists():
            return Response({"error": f"A user with email '{admin_email}' already exists. Please use a unique administrator email."}, status=status.HTTP_400_BAD_REQUEST)

        # Perform transactional onboarding
        try:
            with transaction.atomic():
                # 1. Create Tenant (Client) -> Runs migrations automatically
                tenant = Client.objects.create(
                    schema_name=schema_name,
                    name=name,
                    contact_email=admin_email,
                    contact_phone=contact_phone,
                    subscription_plan=plan_slug,
                    is_active=True
                )

                # 2. Create Domain
                Domain.objects.create(
                    domain=full_domain,
                    tenant=tenant,
                    is_primary=True
                )

                # 3. Create Tenant Subscription
                today = timezone.localdate()
                TenantSubscription.objects.create(
                    tenant=tenant,
                    plan=plan,
                    status=SubscriptionStatus.TRIAL if plan.price_monthly > 0 else SubscriptionStatus.ACTIVE,
                    trial_ends_at=today + timedelta(days=14) if plan.price_monthly > 0 else None,
                    current_period_start=today,
                    current_period_end=today + timedelta(days=30),
                    next_billing_date=today + timedelta(days=30)
                )

                # 4. Create Tenant superuser inside its schema context
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
                "plan": plan.name,
                "onboarded_at": tenant.onboarded_at
            }, status=status.HTTP_201_CREATED)

        except Exception as e:
            return Response({"error": f"Failed to onboard tenant: {str(e)}"}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
