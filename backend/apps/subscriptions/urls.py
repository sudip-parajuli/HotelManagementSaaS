"""
SIA HMS — Subscriptions & Super Admin URLs
Defines public-schema admin endpoints.
"""

from django.urls import path, include
from rest_framework.routers import DefaultRouter

from apps.accounts.admin_views import (
    TenantManagementViewSet,
    SuperAdminMetricsView,
    ImpersonationLogViewSet,
    SuperAdminTaxConfigView,
    TenantFeatureGrantView,
    TenantFeatureGrantActionView,
    TenantUsageView,
    AddonModuleViewSet,
    AddonRequestViewSet,
    ModuleRevenueAnalyticsView,
    TenantModuleSubscriptionsView,
    TenantModuleSubscriptionActionView,
    SystemHealthView,
)
from apps.subscriptions.views import (
    SubscriptionPlanViewSet,
    TenantSubscriptionViewSet,
    SubscriptionInvoiceViewSet
)

router = DefaultRouter()
router.register(r"tenants", TenantManagementViewSet, basename="admin-tenants")
router.register(r"plans", SubscriptionPlanViewSet, basename="admin-plans")
router.register(r"subscriptions", TenantSubscriptionViewSet, basename="admin-subscriptions")
router.register(r"invoices", SubscriptionInvoiceViewSet, basename="admin-invoices")
router.register(r"impersonation-logs", ImpersonationLogViewSet, basename="admin-impersonation-logs")
router.register(r"addons/catalog", AddonModuleViewSet, basename="admin-addon-catalog")
router.register(r"addons/requests", AddonRequestViewSet, basename="admin-addon-requests")

urlpatterns = [
    path("metrics/", SuperAdminMetricsView.as_view(), name="admin-metrics"),
    path("tax-config/", SuperAdminTaxConfigView.as_view(), name="admin-tax-config"),
    path("system/health/", SystemHealthView.as_view(), name="admin-system-health"),

    # Tenant-specific feature management
    path("tenants/<int:tenant_id>/features/", TenantFeatureGrantView.as_view(), name="tenant-features"),
    path("tenants/<int:tenant_id>/features/<str:action_type>/", TenantFeatureGrantActionView.as_view(), name="tenant-feature-action"),
    path("tenants/<int:tenant_id>/usage/", TenantUsageView.as_view(), name="tenant-usage"),
    path("tenants/<int:tenant_id>/module-subscriptions/", TenantModuleSubscriptionsView.as_view(), name="tenant-module-subs"),
    path("tenants/<int:tenant_id>/module-subscriptions/activate/", TenantModuleSubscriptionActionView.as_view(), name="tenant-module-sub-activate"),
    path("tenants/<int:tenant_id>/module-subscriptions/deactivate/", TenantModuleSubscriptionActionView.as_view(), name="tenant-module-sub-deactivate"),

    # Module Revenue Analytics
    path("revenue/modules/", ModuleRevenueAnalyticsView.as_view(), name="module-revenue"),

    path("", include(router.urls)),
]

