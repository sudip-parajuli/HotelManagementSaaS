"""
SIA HMS — Subscriptions Permissions & Gating
Defines RBAC and SaaS subscription per-module feature checking guards.
Feature gating now uses TenantModuleSubscription (active subscriptions)
with TenantFeatureGrant as a manual override.
"""

from rest_framework.permissions import BasePermission
from rest_framework.exceptions import PermissionDenied
from apps.subscriptions.models import TenantModuleSubscription, TenantModuleSubscriptionStatus


class HasFeaturePermission(BasePermission):
    """
    Base permission checking if the active tenant has an ACTIVE
    TenantModuleSubscription for the required module key.

    Also checks TenantFeatureGrant for manual override grants by SuperAdmin.
    Returns 403 with structured error response when module is not activated.
    """
    feature_key = None

    def has_permission(self, request, view):
        if not request.user or not request.user.is_authenticated:
            return False

        # Super Admins bypass feature gates
        if request.user.role == "SUPER_ADMIN":
            return True

        tenant = getattr(request, "tenant", None)
        if not tenant:
            return False

        if not self.feature_key:
            return True

        try:
            # 1. Check active TenantModuleSubscription
            active_sub = TenantModuleSubscription.objects.filter(
                tenant=tenant,
                module__key=self.feature_key,
                status=TenantModuleSubscriptionStatus.ACTIVE
            ).exists()

            if active_sub:
                return True

            # 2. Check manual TenantFeatureGrant as override
            from apps.subscriptions.models import TenantFeatureGrant
            grant = TenantFeatureGrant.objects.filter(
                tenant=tenant,
                feature_key=self.feature_key,
                is_active=True
            ).first()
            if grant and grant.is_valid():
                return True

            # 3. Not activated — return 403 with structured error
            message = {
                "error": "module_not_activated",
                "module": self.feature_key,
                "upgrade_url": "/settings/modules"
            }
            raise PermissionDenied(message)

        except PermissionDenied:
            raise
        except Exception:
            return False


class HasPayrollFeature(HasFeaturePermission):
    feature_key = "payroll"


class HasCRMFeature(HasFeaturePermission):
    feature_key = "crm"


class HasAdvancedAnalytics(HasFeaturePermission):
    feature_key = "analytics"

