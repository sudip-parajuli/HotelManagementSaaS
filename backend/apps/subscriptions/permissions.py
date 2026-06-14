"""
SIA HMS — Subscriptions Permissions & Gating
Defines RBAC and SaaS subscription feature checking guards.
"""

from rest_framework.permissions import BasePermission
from apps.subscriptions.models import TenantSubscription, SubscriptionStatus


class HasFeaturePermission(BasePermission):
    """
    Base permission checking if the active tenant's subscription
    plan includes the required feature key.
    """
    feature_key = None

    def has_permission(self, request, view):
        if not request.user or not request.user.is_authenticated:
            return False

        # Super Admins bypass feature gates (SaaS managers)
        if request.user.role == "SUPER_ADMIN":
            return True

        tenant = getattr(request, "tenant", None)
        if not tenant:
            return False

        try:
            # Query subscription details from the public schema
            sub = TenantSubscription.objects.filter(tenant=tenant).first()
            if not sub:
                return False

            # Suspended tenants have restricted access
            if sub.status == SubscriptionStatus.SUSPENDED:
                return False

            # Gating check
            if self.feature_key and self.feature_key not in sub.plan.features:
                return False

            return True
        except Exception:
            return False


class HasPayrollFeature(HasFeaturePermission):
    feature_key = "payroll"


class HasCRMFeature(HasFeaturePermission):
    feature_key = "crm"


class HasAdvancedAnalytics(HasFeaturePermission):
    feature_key = "analytics"
