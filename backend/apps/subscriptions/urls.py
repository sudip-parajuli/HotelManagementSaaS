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
    SuperAdminTaxConfigView
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

urlpatterns = [
    path("metrics/", SuperAdminMetricsView.as_view(), name="admin-metrics"),
    path("tax-config/", SuperAdminTaxConfigView.as_view(), name="admin-tax-config"),
    path("", include(router.urls)),
]
