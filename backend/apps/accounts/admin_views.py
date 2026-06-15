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
from apps.accounts.models import User, UserRole, ImpersonationLog
from apps.accounts.serializers import ImpersonationLogSerializer
from apps.tenants.models import Client, Domain
from apps.subscriptions.models import SubscriptionPlan, TenantSubscription, SubscriptionStatus, SubscriptionInvoice, InvoiceStatus
from apps.subscriptions.serializers import SubscriptionPlanSerializer, ClientSerializer
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
    serializer_class = ClientSerializer
    pagination_class = None

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
        Requires a reason and logs the request.
        """
        tenant = self.get_object()
        reason = request.data.get("reason")
        if not reason or not reason.strip():
            return Response(
                {"reason": ["This field is required for auditing impersonation."]},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        # Get client IP
        x_forwarded_for = request.META.get('HTTP_X_FORWARDED_FOR')
        if x_forwarded_for:
            ip_address = x_forwarded_for.split(',')[0].strip()
        else:
            ip_address = request.META.get('REMOTE_ADDR')

        # End any open impersonation sessions for this admin before starting a new one
        ImpersonationLog.objects.filter(
            admin_user=request.user,
            ended_at__isnull=True
        ).update(ended_at=timezone.now())

        # Log impersonation
        ImpersonationLog.objects.create(
            admin_user=request.user,
            target_tenant=tenant,
            reason=reason,
            ip_address=ip_address
        )

        # Sign custom simplejwt token for the logged-in super admin
        refresh = RefreshToken.for_user(request.user)
        refresh["role"] = UserRole.SUPER_ADMIN
        refresh["tenant_schema"] = tenant.schema_name
        refresh["full_name"] = f"Impersonated: {tenant.name}"
        refresh["impersonation_reason"] = reason

        # Hardcode lifetimes to 10 minutes for token hardening
        refresh.set_exp(lifetime=timedelta(minutes=10))
        access = refresh.access_token
        access.set_exp(lifetime=timedelta(minutes=10))

        return Response({
            "access": str(access),
            "refresh": str(refresh),
            "tenant_name": tenant.name,
            "schema_name": tenant.schema_name,
            "impersonation_reason": reason
        })

    @action(detail=False, methods=["post"], url_path="stop-impersonation")
    def stop_impersonation(self, request):
        """
        Ends any active impersonation sessions for this super admin.
        """
        active_logs = ImpersonationLog.objects.filter(
            admin_user=request.user,
            ended_at__isnull=True
        )
        count = active_logs.count()
        active_logs.update(ended_at=timezone.now())
        return Response({"message": f"Successfully ended {count} impersonation session(s)."})

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


class ImpersonationLogViewSet(viewsets.ReadOnlyModelViewSet):
    """
    Super Admin viewset for reviewing Impersonation/Audit logs.
    """
    permission_classes = [IsAuthenticated, IsSuperAdmin]
    serializer_class = ImpersonationLogSerializer
    queryset = ImpersonationLog.objects.all().order_by("-started_at")


from apps.payroll.models import TaxSlab, SSFConfig
from apps.payroll.serializers import TaxSlabSerializer, SSFConfigSerializer

class SuperAdminTaxConfigView(APIView):
    """
    Super Admin view for viewing and updating progressive tax slabs and SSF rates.
    Syncs updates across all active tenant schemas dynamically.
    """
    permission_classes = [IsAuthenticated, IsSuperAdmin]

    def get(self, request):
        tenant = Client.objects.exclude(schema_name='public').first()
        if not tenant:
            return Response({"tax_slabs": [], "ssf_config": []})
        
        with tenant_context(tenant):
            slabs = TaxSlab.objects.all().order_by("fiscal_year", "filing_status", "slab_order")
            ssf = SSFConfig.objects.all().order_by("-fiscal_year")
            
            slabs_serializer = TaxSlabSerializer(slabs, many=True)
            ssf_serializer = SSFConfigSerializer(ssf, many=True)
            
            return Response({
                "tax_slabs": slabs_serializer.data,
                "ssf_config": ssf_serializer.data
            })

    def post(self, request):
        tax_slabs_data = request.data.get("tax_slabs", [])
        ssf_config_data = request.data.get("ssf_config", [])

        if not tax_slabs_data and not ssf_config_data:
            return Response({"error": "No data provided to update."}, status=status.HTTP_400_BAD_REQUEST)

        # Loop through all active tenants and update
        tenants = Client.objects.exclude(schema_name='public').filter(is_active=True)
        for tenant in tenants:
            with tenant_context(tenant):
                # 1. Update Tax Slabs if provided
                if tax_slabs_data:
                    # Clear existing and recreate
                    TaxSlab.objects.all().delete()
                    for item in tax_slabs_data:
                        # Convert max_amount empty string or None safely
                        max_amt = item.get("max_amount")
                        if max_amt == "" or max_amt == "null" or max_amt is None:
                            max_amt = None
                        TaxSlab.objects.create(
                            fiscal_year=item.get("fiscal_year"),
                            filing_status=item.get("filing_status"),
                            slab_order=item.get("slab_order"),
                            min_amount=item.get("min_amount"),
                            max_amount=max_amt,
                            rate_percent=item.get("rate_percent")
                        )

                # 2. Update SSF Config if provided
                if ssf_config_data:
                    SSFConfig.objects.all().delete()
                    for item in ssf_config_data:
                        SSFConfig.objects.create(
                            fiscal_year=item.get("fiscal_year"),
                            employee_rate_percent=item.get("employee_rate_percent"),
                            employer_rate_percent=item.get("employer_rate_percent"),
                            is_active=item.get("is_active", True)
                        )

        return Response({"message": "Tax slabs and SSF rates successfully synchronized across all active tenants."})


