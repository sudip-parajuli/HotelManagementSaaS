"""
SIA HMS — Timed Sessions API URLs
"""

from django.urls import path, include
from rest_framework.routers import DefaultRouter
from apps.timed_sessions.views import (
    SessionUnitTypeViewSet,
    SessionUnitViewSet,
    TimedSessionViewSet,
    StartSessionView,
    SessionReportsView,
)

router = DefaultRouter()
router.register(r"unit-types", SessionUnitTypeViewSet, basename="session-unit-types")
router.register(r"units", SessionUnitViewSet, basename="session-units")
router.register(r"", TimedSessionViewSet, basename="sessions")

urlpatterns = [
    path("start/", StartSessionView.as_view(), name="session-start"),
    path("reports/daily/", SessionReportsView.as_view(), {"report": "daily"}, name="session-reports-daily"),
    path("reports/units/", SessionReportsView.as_view(), {"report": "units"}, name="session-reports-units"),
    path("", include(router.urls)),
]
