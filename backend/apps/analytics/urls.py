from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import (
    DashboardSummaryView,
    RevenueAnalyticsView,
    OccupancyAnalyticsView,
    TopMenuItemsView,
    GuestSourcesView,
    ReportExportViewSet
)

router = DefaultRouter()
router.register(r"reports", ReportExportViewSet, basename="report-export")

urlpatterns = [
    path("dashboard/", DashboardSummaryView.as_view(), name="analytics-dashboard"),
    path("revenue/", RevenueAnalyticsView.as_view(), name="analytics-revenue"),
    path("occupancy/", OccupancyAnalyticsView.as_view(), name="analytics-occupancy"),
    path("top-items/", TopMenuItemsView.as_view(), name="analytics-top-items"),
    path("guest-sources/", GuestSourcesView.as_view(), name="analytics-guest-sources"),
    path("", include(router.urls)),
]

