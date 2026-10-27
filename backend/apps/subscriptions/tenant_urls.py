"""
SIA HMS — Tenant-Facing Module URL Configuration
"""

from django.urls import path
from apps.subscriptions.tenant_views import (
    ModuleCatalogView,
    BusinessTypeListView,
    TenantInfoView,
    ActivateModulesView,
    DeactivateModuleView,
)

urlpatterns = [
    path("", ModuleCatalogView.as_view(), name="module-catalog"),
    path("business-types/", BusinessTypeListView.as_view(), name="business-types"),
    path("tenant/", TenantInfoView.as_view(), name="tenant-info"),
    path("activate/", ActivateModulesView.as_view(), name="activate-modules"),
    path("deactivate/", DeactivateModuleView.as_view(), name="deactivate-module"),
]
