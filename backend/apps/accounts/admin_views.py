"""
SIA HMS — Super Admin API Views
Handles tenant onboarding, domain routing, schema migrations, impersonation tokens, and platforms MRR metrics.
"""

import re
from datetime import timedelta
from django.utils import timezone
from django.db import connection
from django.db.models import Sum, Max
from django.db.models.functions import TruncMonth
from django_tenants.utils import tenant_context

from rest_framework import viewsets, status
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.decorators import action
from rest_framework.permissions import IsAuthenticated
from rest_framework_simplejwt.tokens import RefreshToken
from django.shortcuts import get_object_or_404
from decimal import Decimal
from apps.subscriptions.revenue import monthly_recurring_total

from apps.accounts.permissions import IsSuperAdmin
from apps.accounts.models import User, UserRole, ImpersonationLog
from apps.accounts.serializers import ImpersonationLogSerializer
from apps.tenants.models import Client, Domain, BusinessType
from apps.subscriptions.models import (
    SubscriptionPlan, TenantSubscription, SubscriptionStatus,
    SubscriptionInvoice, InvoiceStatus, AddonModule,
)
from apps.subscriptions.models import (
    TenantModuleSubscription, TenantModuleSubscriptionStatus,
    ModuleBillingCycle, TenantFeatureGrant, AddonRequestStatus,
    AddonRequest,
)
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
    - Plus extended platform dashboard metrics
    """
    permission_classes = [IsAuthenticated, IsSuperAdmin]

    def get(self, request):
        today = timezone.localdate()
        
        # 1. Counts
        total_tenants = Client.objects.exclude(schema_name='public').count()
        active_count = Client.objects.filter(is_active=True).exclude(schema_name='public').count()
        trial_count = TenantSubscription.objects.filter(status=SubscriptionStatus.TRIAL).count()
        pending_invoices = SubscriptionInvoice.objects.filter(status=InvoiceStatus.PENDING).count()

        # Trial ending in 3 days
        trial_ending_soon = TenantSubscription.objects.filter(
            status=SubscriptionStatus.TRIAL,
            trial_ends_at__gte=today,
            trial_ends_at__lte=today + timedelta(days=3)
        ).count()

        # Churn this month (cancelled_at or fallback updated_at in current month)
        churn_this_month = TenantSubscription.objects.filter(
            status=SubscriptionStatus.CANCELLED,
            cancelled_at__year=today.year,
            cancelled_at__month=today.month
        ).count()

        # 2. MRR Calculation
        # Sum plan price_monthly + module subscription prices
        plan_mrr_agg = TenantSubscription.objects.filter(
            status__in=[SubscriptionStatus.ACTIVE, SubscriptionStatus.PAST_DUE]
        ).aggregate(total_mrr=Sum('plan__price_monthly'))
        plan_mrr = float(plan_mrr_agg['total_mrr'] or 0.0)

        module_prices = TenantModuleSubscription.objects.filter(
            status__in=[
                TenantModuleSubscriptionStatus.ACTIVE,
                TenantModuleSubscriptionStatus.TRIAL,
            ]
        ).values_list('price_at_activation', 'billing_cycle')
        module_mrr = float(monthly_recurring_total(module_prices))

        mrr = plan_mrr + module_mrr

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

        # 4. Plan Distribution
        plan_distribution = {}
        for plan in SubscriptionPlan.objects.all():
            count = TenantSubscription.objects.filter(plan=plan).count()
            plan_distribution[plan.name] = count

        # 5. Tenant Health
        tenant_health = []
        tenants = Client.objects.exclude(schema_name='public')
        for tenant in tenants:
            plan_name = "No Plan"
            sub_status = "Inactive"
            sub = TenantSubscription.objects.filter(tenant=tenant).first()
            if sub:
                plan_name = sub.plan.name
                sub_status = sub.status

            # Calculate last login
            last_active_str = "Never"
            days_since_active = 9999
            try:
                with tenant_context(tenant):
                    last_login_agg = User.objects.aggregate(max_login=Max('last_login'))
                    last_login_dt = last_login_agg['max_login']
                    if last_login_dt:
                        last_active_str = last_login_dt.strftime("%Y-%m-%d")
                        days_since_active = (today - last_login_dt.date()).days
            except Exception:
                pass

            if days_since_active > 14:
                activity_status = "at_risk"
            elif days_since_active > 7:
                activity_status = "low_activity"
            else:
                activity_status = "healthy"

            tenant_health.append({
                "id": tenant.id,
                "name": tenant.name,
                "plan": plan_name,
                "status": sub_status,
                "last_active": last_active_str,
                "days_since_signup": (today - tenant.created_on).days if tenant.created_on else 0,
                "activity_status": activity_status
            })

        # Sort tenant health: show at risk first, then by name
        tenant_health.sort(key=lambda x: (x['activity_status'] != 'at_risk', x['activity_status'] != 'low_activity', x['name']))

        # 6. Recent Platform Events (Activity Feed)
        events = []
        # New tenant signups
        for t_item in Client.objects.exclude(schema_name='public').order_by('-onboarded_at')[:10]:
            if t_item.onboarded_at:
                events.append({
                    "id": f"signup_{t_item.id}",
                    "timestamp": t_item.onboarded_at.isoformat(),
                    "type": "signup",
                    "message": f"New tenant onboarded: {t_item.name} ({t_item.schema_name})"
                })
        # Impersonation logs
        for log in ImpersonationLog.objects.all().order_by('-started_at')[:10]:
            events.append({
                "id": f"imp_{log.id}",
                "timestamp": log.started_at.isoformat(),
                "type": "impersonation",
                "message": f"Admin impersonated {log.target_tenant.name}: {log.reason}"
            })
        # Subscription invoices
        for inv in SubscriptionInvoice.objects.filter(status=InvoiceStatus.PAID).order_by('-paid_at')[:10]:
            if inv.paid_at:
                events.append({
                    "id": f"inv_{inv.id}",
                    "timestamp": inv.paid_at.isoformat(),
                    "type": "payment",
                    "message": f"Subscription payment of Rs. {inv.amount} received from {inv.tenant.name}"
                })

        events.sort(key=lambda x: x['timestamp'], reverse=True)
        recent_events = events[:20]

        return Response({
            "total_tenants": total_tenants,
            "active_hotels": active_count,
            "active_tenants": active_count,
            "trial_hotels": trial_count,
            "trial_tenants": trial_count,
            "pending_invoices": pending_invoices,
            "trial_ending_soon": trial_ending_soon,
            "churn_this_month": churn_this_month,
            "mrr": mrr,
            "plan_mrr": plan_mrr,
            "module_mrr": module_mrr,
            "growth_data": growth_data,
            "plan_distribution": plan_distribution,
            "tenant_health": tenant_health[:10],
            "recent_events": recent_events
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
        business_type_key = request.data.get("business_type", "")

        # Validation
        if not name or not schema_name or not subdomain or not admin_email or not admin_password:
            return Response(
                {"error": "name, schema_name, subdomain, admin_email, and admin_password are required fields."},
                status=status.HTTP_400_BAD_REQUEST
            )

        business_type = None
        if business_type_key:
            business_type = BusinessType.objects.filter(key=business_type_key).first()
            if not business_type:
                return Response(
                    {"error": f"Business type '{business_type_key}' not found."},
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

        # Perform tenant onboarding
        # NOTE: transaction.atomic() is NOT used because auto_create_schema runs
        # DDL (CREATE SCHEMA + migrations) which is incompatible with nested
        # transaction management.
        try:
            # 1. Create Tenant (Client) -> Runs migrations automatically
            tenant = Client.objects.create(
                schema_name=schema_name,
                name=name,
                contact_email=admin_email,
                contact_phone=contact_phone,
                subscription_plan=plan_slug,
                business_type=business_type,
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

            # 4. Auto-activate recommended modules if business_type is set
            core_mods = AddonModule.objects.filter(is_active=True, is_core=True)
            for mod in core_mods:
                TenantModuleSubscription.objects.get_or_create(
                    tenant=tenant,
                    module=mod,
                    defaults={
                        "status": TenantModuleSubscriptionStatus.ACTIVE,
                        "billing_cycle": ModuleBillingCycle.MONTHLY,
                        "price_at_activation": mod.price_monthly or Decimal("0"),
                        "activated_at": timezone.now(),
                    }
                )

            if business_type:
                recommended_mods = AddonModule.objects.filter(
                    is_active=True,
                    key__in=business_type.recommended_modules.values_list("key", flat=True),
                )
                for mod in recommended_mods:
                    TenantModuleSubscription.objects.get_or_create(
                        tenant=tenant,
                        module=mod,
                        defaults={
                            "status": TenantModuleSubscriptionStatus.ACTIVE,
                            "billing_cycle": ModuleBillingCycle.MONTHLY,
                            "price_at_activation": mod.price_monthly or Decimal("0"),
                            "activated_at": timezone.now(),
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


# ─── Tenant Feature Grants ────────────────────────────────────────────────────

from apps.subscriptions.models import TenantFeatureGrant, AddonModule, AddonRequest, AddonRequestStatus


class TenantFeatureGrantView(APIView):
    """
    GET  /api/admin/tenants/{id}/features/       — list all features (plan + manual grants)
    POST /api/admin/tenants/{id}/features/grant/ — grant a feature to a tenant
    POST /api/admin/tenants/{id}/features/revoke/ — revoke a manual grant
    """
    permission_classes = [IsAuthenticated, IsSuperAdmin]

    def get(self, request, tenant_id):
        tenant = Client.objects.exclude(schema_name='public').filter(id=tenant_id).first()
        if not tenant:
            return Response({"error": "Tenant not found."}, status=status.HTTP_404_NOT_FOUND)

        sub = TenantSubscription.objects.filter(tenant=tenant).first()
        plan_features = sub.plan.features if sub else []

        grants = TenantFeatureGrant.objects.filter(tenant=tenant)
        grant_map = {g.feature_key: g for g in grants}

        # All known features from all plans
        all_plan_features = set()
        for plan in SubscriptionPlan.objects.all():
            all_plan_features.update(plan.features or [])
        # Also include all manual grants
        for g in grants:
            all_plan_features.add(g.feature_key)

        feature_list = []
        for key in sorted(all_plan_features):
            grant = grant_map.get(key)
            feature_list.append({
                "key": key,
                "in_plan": key in plan_features,
                "manually_granted": grant is not None and grant.is_valid(),
                "grant_expires_at": grant.expires_at.isoformat() if grant and grant.expires_at else None,
                "grant_reason": grant.reason if grant else "",
                "grant_id": grant.id if grant else None,
            })

        return Response({"features": feature_list, "plan": sub.plan.name if sub else None})


class TenantFeatureGrantActionView(APIView):
    """
    POST /api/admin/tenants/{id}/features/grant/  — add a new TenantFeatureGrant
    POST /api/admin/tenants/{id}/features/revoke/ — deactivate an existing grant
    """
    permission_classes = [IsAuthenticated, IsSuperAdmin]

    def post(self, request, tenant_id, action_type):
        tenant = Client.objects.exclude(schema_name='public').filter(id=tenant_id).first()
        if not tenant:
            return Response({"error": "Tenant not found."}, status=status.HTTP_404_NOT_FOUND)

        if action_type == "grant":
            feature_key = request.data.get("feature_key")
            reason = request.data.get("reason", "")
            expires_at = request.data.get("expires_at")  # nullable ISO date

            if not feature_key:
                return Response({"error": "feature_key is required."}, status=status.HTTP_400_BAD_REQUEST)

            grant, created = TenantFeatureGrant.objects.get_or_create(
                tenant=tenant,
                feature_key=feature_key,
                defaults={"granted_by": request.user, "reason": reason, "expires_at": expires_at}
            )
            if not created:
                grant.is_active = True
                grant.reason = reason
                grant.expires_at = expires_at
                grant.granted_by = request.user
                grant.save()

            return Response({
                "message": f"Feature '{feature_key}' granted to {tenant.name}.",
                "grant_id": grant.id
            })

        elif action_type == "revoke":
            feature_key = request.data.get("feature_key")
            if not feature_key:
                return Response({"error": "feature_key is required."}, status=status.HTTP_400_BAD_REQUEST)

            updated = TenantFeatureGrant.objects.filter(
                tenant=tenant, feature_key=feature_key
            ).update(is_active=False)

            return Response({
                "message": f"Feature '{feature_key}' revoked from {tenant.name}.",
                "revoked": updated
            })

        return Response({"error": "Invalid action."}, status=status.HTTP_400_BAD_REQUEST)


class TenantUsageView(APIView):
    """
    GET /api/admin/tenants/{id}/usage/ — returns room/staff usage vs plan limits
    """
    permission_classes = [IsAuthenticated, IsSuperAdmin]

    def get(self, request, tenant_id):
        tenant = Client.objects.exclude(schema_name='public').filter(id=tenant_id).first()
        if not tenant:
            return Response({"error": "Tenant not found."}, status=status.HTTP_404_NOT_FOUND)

        sub = TenantSubscription.objects.filter(tenant=tenant).first()
        plan = sub.plan if sub else None

        usage = {}
        try:
            with tenant_context(tenant):
                from apps.properties.models import Room
                room_count = Room.objects.count()
                staff_count = User.objects.filter(is_active=True).exclude(role="SUPER_ADMIN").count()
                usage = {
                    "rooms_used": room_count,
                    "rooms_limit": plan.max_rooms if plan else None,
                    "staff_used": staff_count,
                    "staff_limit": plan.max_staff_users if plan else None,
                }
        except Exception as e:
            usage = {"error": str(e)}

        return Response({
            "tenant": tenant.name,
            "plan": plan.name if plan else None,
            "status": sub.status if sub else None,
            **usage
        })


# ─── Add-on Marketplace Admin Views ──────────────────────────────────────────

class AddonModuleViewSet(viewsets.ModelViewSet):
    """
    CRUD management of AddonModule catalog by SuperAdmin.
    Handles depends_on M2M and recommended_for JSON fields.
    """
    permission_classes = [IsAuthenticated, IsSuperAdmin]
    pagination_class = None
    queryset = AddonModule.objects.all().order_by("category", "name")

    def get_serializer_class(self):
        from apps.subscriptions.serializers import AddonModuleSerializer
        return AddonModuleSerializer

    def perform_create(self, serializer):
        instance = serializer.save()
        depends = self.request.data.get("depends_on", [])
        if depends:
            instance.depends_on.set(
                AddonModule.objects.filter(key__in=depends)
            )

    def perform_update(self, serializer):
        instance = serializer.save()
        if "depends_on" in self.request.data:
            depends = self.request.data.get("depends_on", [])
            instance.depends_on.set(
                AddonModule.objects.filter(key__in=depends)
            )


class AddonRequestViewSet(viewsets.ModelViewSet):
    """
    SuperAdmin management of tenant add-on requests.
    """
    permission_classes = [IsAuthenticated, IsSuperAdmin]
    pagination_class = None
    queryset = AddonRequest.objects.select_related("tenant", "addon", "requested_by").all()
    http_method_names = ["get", "post", "patch", "head", "options"]

    def get_serializer_class(self):
        from apps.subscriptions.serializers import AddonRequestSerializer
        return AddonRequestSerializer

    @action(detail=True, methods=["post"])
    def approve(self, request, pk=None):
        addon_request = self.get_object()
        if addon_request.status != AddonRequestStatus.PENDING:
            return Response({"error": "Only pending requests can be approved."}, status=status.HTTP_400_BAD_REQUEST)

        addon_request.status = AddonRequestStatus.APPROVED
        addon_request.reviewed_by = request.user
        addon_request.reviewed_at = timezone.now()
        addon_request.save()

        # Auto-create TenantFeatureGrant
        TenantFeatureGrant.objects.update_or_create(
            tenant=addon_request.tenant,
            feature_key=addon_request.addon.key,
            defaults={
                "granted_by": request.user,
                "reason": f"Addon approved: {addon_request.addon.name}",
                "is_active": True,
            }
        )

        return Response({"message": f"Addon '{addon_request.addon.name}' approved for {addon_request.tenant.name}."})

    @action(detail=True, methods=["post"])
    def reject(self, request, pk=None):
        addon_request = self.get_object()
        reason = request.data.get("reason", "")
        if addon_request.status != AddonRequestStatus.PENDING:
            return Response({"error": "Only pending requests can be rejected."}, status=status.HTTP_400_BAD_REQUEST)

        addon_request.status = AddonRequestStatus.REJECTED
        addon_request.rejection_reason = reason
        addon_request.reviewed_by = request.user
        addon_request.reviewed_at = timezone.now()
        addon_request.save()

        return Response({"message": f"Addon request rejected."})


class ModuleRevenueAnalyticsView(APIView):
    """
    GET /api/admin/revenue/modules/
    Returns per-module revenue analytics:
    - MRR per module from contracted prices, normalized for annual billing
    - Most popular modules (by tenant count)
    - Activation trends
    - Churn per module
    """
    permission_classes = [IsAuthenticated, IsSuperAdmin]

    def get(self, request):
        from django.db.models import Count, Q
        from apps.subscriptions.models import (
            AddonModule, TenantModuleSubscription,
            TenantModuleSubscriptionStatus as SubStatus,
        )

        all_modules = AddonModule.objects.filter(is_active=True)
        data = []
        total_mrr = 0
        for mod in all_modules:
            active_subs = list(TenantModuleSubscription.objects.filter(
                module=mod, status=SubStatus.ACTIVE, tenant__is_active=True
            ).values_list("price_at_activation", "billing_cycle"))
            active_count = len(active_subs)
            cancelled_count = TenantModuleSubscription.objects.filter(
                module=mod, status=SubStatus.CANCELLED
            ).count()
            mrr = float(monthly_recurring_total(active_subs))
            total_mrr += mrr
            data.append({
                "key": mod.key,
                "name": mod.name,
                "category": mod.category,
                "icon_name": mod.icon_name,
                "price_monthly": str(mod.price_monthly) if mod.price_monthly else "0",
                "price_yearly": str(mod.price_yearly) if mod.price_yearly else None,
                "is_core": mod.is_core,
                "active_tenants": active_count,
                "cancelled_tenants": cancelled_count,
                "mrr": mrr,
            })

        data.sort(key=lambda x: x["mrr"], reverse=True)

        # Monthly activation trend (last 6 months)
        from django.utils import timezone
        from datetime import timedelta
        from django.db.models.functions import TruncMonth
        six_months_ago = timezone.now() - timedelta(days=180)
        trends = (
            TenantModuleSubscription.objects
            .filter(activated_at__gte=six_months_ago)
            .annotate(month=TruncMonth("activated_at"))
            .values("month", "module__key", "module__name")
            .annotate(count=Count("id"))
            .order_by("month")
        )

        trend_data = {}
        for t in trends:
            month_key = t["month"].strftime("%Y-%m") if t["month"] else "unknown"
            if month_key not in trend_data:
                trend_data[month_key] = {}
            trend_data[month_key][t["module__key"]] = {
                "name": t["module__name"],
                "count": t["count"],
            }

        return Response({
            "modules": data,
            "total_mrr": total_mrr,
            "trends": trend_data,
        })


class TenantModuleSubscriptionsView(APIView):
    """
    GET /api/admin/tenants/{tenant_id}/module-subscriptions/
    POST /api/admin/tenants/{tenant_id}/module-subscriptions/activate/
    POST /api/admin/tenants/{tenant_id}/module-subscriptions/deactivate/
    """
    permission_classes = [IsAuthenticated, IsSuperAdmin]

    def get(self, request, tenant_id):
        tenant = get_object_or_404(Client, id=tenant_id)
        subs = TenantModuleSubscription.objects.filter(tenant=tenant).select_related("module")
        data = []
        for sub in subs:
            data.append({
                "id": sub.id,
                "module_key": sub.module.key,
                "module_name": sub.module.name,
                "module_category": sub.module.category,
                "status": sub.status,
                "billing_cycle": sub.billing_cycle,
                "price_at_activation": str(sub.price_at_activation),
                "activated_at": sub.activated_at.isoformat() if sub.activated_at else None,
                "cancelled_at": sub.cancelled_at.isoformat() if sub.cancelled_at else None,
                "next_billing_date": sub.next_billing_date.isoformat() if sub.next_billing_date else None,
            })
        return Response(data)


class TenantModuleSubscriptionActionView(APIView):
    """
    POST /api/admin/tenants/{tenant_id}/module-subscriptions/activate/
    { "module_key": "key", "price": "0", "billing_cycle": "monthly" }

    POST /api/admin/tenants/{tenant_id}/module-subscriptions/deactivate/
    { "module_key": "key" }
    """
    permission_classes = [IsAuthenticated, IsSuperAdmin]

    def post(self, request, tenant_id):
        tenant = get_object_or_404(Client, id=tenant_id)
        action = request.resolver_match.url_name or ""

        if "activate" in action or "activate" in request.path:
            module_key = request.data.get("module_key")
            price = request.data.get("price", "0")
            billing_cycle = request.data.get("billing_cycle", ModuleBillingCycle.MONTHLY)

            mod = get_object_or_404(AddonModule, key=module_key, is_active=True)
            sub, created = TenantModuleSubscription.objects.update_or_create(
                tenant=tenant,
                module=mod,
                defaults={
                    "status": TenantModuleSubscriptionStatus.ACTIVE,
                    "billing_cycle": billing_cycle,
                    "price_at_activation": Decimal(price) if price else Decimal("0"),
                    "next_billing_date": timezone.localdate(),
                },
            )
            return Response({
                "message": f"Module '{mod.name}' {'activated' if created else 'updated'}",
                "id": sub.id,
                "status": sub.status,
            })

        elif "deactivate" in action or "deactivate" in request.path:
            module_key = request.data.get("module_key")
            mod = get_object_or_404(AddonModule, key=module_key)
            sub = get_object_or_404(
                TenantModuleSubscription,
                tenant=tenant, module=mod,
                status=TenantModuleSubscriptionStatus.ACTIVE,
            )
            sub.status = TenantModuleSubscriptionStatus.CANCELLED
            sub.cancelled_at = timezone.now()
            sub.save(update_fields=["status", "cancelled_at"])
            return Response({"message": f"Module '{mod.name}' deactivated"})

        return Response({"error": "Unknown action"}, status=400)


class SystemHealthView(APIView):
    """
    GET /api/admin/system/health/ — ping essential services and return status
    """
    permission_classes = [IsAuthenticated, IsSuperAdmin]

    def get(self, request):
        import time
        services = {}

        # Database
        try:
            t0 = time.time()
            from django.db import connection as db_conn
            db_conn.ensure_connection()
            services["database"] = {"status": "ok", "latency_ms": round((time.time() - t0) * 1000, 1)}
        except Exception as e:
            services["database"] = {"status": "error", "error": str(e)}

        from django.conf import settings
        if getattr(settings, "STAYWIRED_RUNTIME", "") == "vercel":
            from apps.tenants.models import ScheduledRun, RealtimeEvent
            from django_tenants.utils import schema_context
            from datetime import timedelta
            import os
            with schema_context("public"):
                # Query the actual shared event table, rather than a local cache.
                RealtimeEvent.objects.order_by("-id").values_list("id", flat=True).first()
                services["live_updates"] = {"status": "ok"}
                latest = ScheduledRun.objects.filter(status="success").order_by("-finished_at").first()
                failed = ScheduledRun.objects.filter(status="failed", started_at__gte=timezone.now()-timedelta(minutes=3)).exists()
                recent = latest and latest.finished_at >= timezone.now()-timedelta(minutes=3)
                services["scheduler"] = {"status": "ok" if recent and not failed else "degraded"}
                if not recent:
                    services["scheduler"]["error"] = "No successful maintenance run in the last three minutes."
                elif failed:
                    services["scheduler"]["error"] = "A recent maintenance job failed. Check its audit record."
            services["private_media"] = {"status": "configured" if os.environ.get("BLOB_READ_WRITE_TOKEN") else "error"}
            return Response({
                "overall": "ok" if all(item["status"] in {"ok", "configured"} for item in services.values()) else "degraded",
                "services": services,
                "checked_at": timezone.now().isoformat(),
            })

        # Redis
        try:
            import redis
            from django.conf import settings
            t0 = time.time()
            r = redis.from_url(settings.CELERY_BROKER_URL)
            r.ping()
            services["redis"] = {"status": "ok", "latency_ms": round((time.time() - t0) * 1000, 1)}
        except Exception as e:
            services["redis"] = {"status": "error", "error": str(e)}

        # Celery (check if any worker is alive via inspect)
        try:
            from celery.app.control import Control
            from config.celery import app as celery_app
            t0 = time.time()
            ctrl = Control(celery_app)
            ping_result = ctrl.ping(timeout=1.0)
            worker_count = len(ping_result) if ping_result else 0
            services["celery"] = {
                "status": "ok" if worker_count > 0 else "no_workers",
                "workers": worker_count,
                "latency_ms": round((time.time() - t0) * 1000, 1)
            }
        except Exception as e:
            services["celery"] = {"status": "error", "error": str(e)}

        overall = "ok" if all(s.get("status") == "ok" for s in services.values()) else "degraded"

        return Response({
            "overall": overall,
            "services": services,
            "checked_at": timezone.now().isoformat()
        })

