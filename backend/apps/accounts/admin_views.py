"""
SIA HMS — Super Admin API Views
Handles tenant onboarding, domain routing, schema migrations, impersonation tokens, and platforms MRR metrics.
"""

import re
from datetime import timedelta
from django.utils import timezone
from django.db import connection, transaction
from django.db.models import Sum
from django.db.models.functions import TruncMonth
from django_tenants.utils import tenant_context

from rest_framework import viewsets, status
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.decorators import action
from rest_framework.permissions import IsAuthenticated
from rest_framework_simplejwt.tokens import RefreshToken

from apps.accounts.permissions import IsSuperAdmin
from apps.accounts.models import User, UserRole
from apps.tenants.models import Client, Domain
from apps.subscriptions.models import SubscriptionPlan, TenantSubscription, SubscriptionStatus, SubscriptionInvoice, InvoiceStatus
from apps.subscriptions.serializers import SubscriptionPlanSerializer
from apps.properties.models import Property

class SuperAdminMetricsView(APIView):
    """
    Returns platform-wide metrics:
    - Active hotels count
    - Trial hotels count
    - Platform Monthly Recurring Revenue (MRR)
    - 12-month MRR growth data
    - Pending invoices count
    """
    permission_classes = [IsAuthenticated, IsSuperAdmin]

    def get(self, request):
        today = timezone.localdate()
        
        # 1. Counts
        active_count = Client.objects.filter(is_active=True).exclude(schema_name='public').count()
        trial_count = TenantSubscription.objects.filter(status=SubscriptionStatus.TRIAL).count()
        pending_invoices = SubscriptionInvoice.objects.filter(status=InvoiceStatus.PENDING).count()

        # 2. MRR Calculation
        # Sum price_monthly of all active/past_due subscriptions
        mrr_agg = TenantSubscription.objects.filter(
            status__in=[SubscriptionStatus.ACTIVE, SubscriptionStatus.PAST_DUE]
        ).aggregate(total_mrr=Sum('plan__price_monthly'))
        
        mrr = float(mrr_agg['total_mrr'] or 0.0)

        # 3. 12-Month Paid Invoices Growth Data
        one_year_ago = today - timedelta(days=365)
        invoice_payments = SubscriptionInvoice.objects.filter(
            status=InvoiceStatus.PAID,
            paid_at__gte=one_year_ago
        ).annotate(
            month=TruncMonth('paid_at')
        ).values('month').annotate(
            revenue=Sum('amount')
        ).order_by('month')

        growth_data = []
        # Seed last 12 months with 0 if no records exist
        for item in invoice_payments:
            growth_data.append({
                "month": item['month'].strftime("%Y-%m"),
                "revenue": float(item['revenue'] or 0.0)
            })

        # Fallback to make the chart look nice in dev if no data yet
        if not growth_data:
            for i in range(11, -1, -1):
                month_date = today - timedelta(days=i*30)
                growth_data.append({
                    "month": month_date.strftime("%Y-%m"),
                    "revenue": 0.0
                })

        return Response({
            "active_hotels": active_count,
            "trial_hotels": trial_count,
            "mrr": mrr,
            "pending_invoices": pending_invoices,
            "growth_data": growth_data
        })


class TenantManagementViewSet(viewsets.ModelViewSet):
    """
    Super Admin viewset for managing Clients/Tenants and Domains.
    Includes onboarding trigger and impersonation.
    """
    permission_classes = [IsAuthenticated, IsSuperAdmin]
    queryset = Client.objects.exclude(schema_name='public').order_by('-created_on')

    def create(self, request, *args, **kwargs):
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
            # Strip subdomains from base if any, or default to configured DOMAIN
            full_domain = f"{subdomain}.{base_domain}"

        if Domain.objects.filter(domain=full_domain).exists():
            return Response({"error": f"Subdomain '{full_domain}' is already in use."}, status=status.HTTP_400_BAD_REQUEST)

        plan = SubscriptionPlan.objects.filter(slug=plan_slug, is_active=True).first()
        if not plan:
            return Response({"error": f"Active subscription plan with slug '{plan_slug}' not found."}, status=status.HTTP_400_BAD_REQUEST)

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

    @action(detail=True, methods=["post"])
    def impersonate(self, request, pk=None):
        """
        Signs and returns a JWT token scoped to the target tenant schema.
        """
        tenant = self.get_object()
        
        # Sign custom simplejwt token for the logged-in super admin
        refresh = RefreshToken.for_user(request.user)
        refresh["role"] = UserRole.SUPER_ADMIN
        refresh["tenant_schema"] = tenant.schema_name
        refresh["full_name"] = f"Impersonated: {tenant.name}"

        return Response({
            "access": str(refresh.access_token),
            "refresh": str(refresh),
            "tenant_name": tenant.name,
            "schema_name": tenant.schema_name
        })

    @action(detail=True, methods=["post"])
    def suspend(self, request, pk=None):
        tenant = self.get_object()
        tenant.is_active = False
        tenant.save()

        # Update subscription status to suspended
        sub = TenantSubscription.objects.filter(tenant=tenant).first()
        if sub:
            sub.status = SubscriptionStatus.SUSPENDED
            sub.save()

        return Response({"message": f"Tenant '{tenant.name}' suspended successfully."})

    @action(detail=True, methods=["post"])
    def activate(self, request, pk=None):
        tenant = self.get_object()
        tenant.is_active = True
        tenant.save()

        # Restore subscription status to active or trial
        sub = TenantSubscription.objects.filter(tenant=tenant).first()
        if sub:
            sub.status = SubscriptionStatus.ACTIVE
            sub.save()

        return Response({"message": f"Tenant '{tenant.name}' activated successfully."})
