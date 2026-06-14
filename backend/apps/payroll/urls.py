"""
SIA HMS — Payroll App URL Configuration
Routes for payroll periods and calculated entries.
"""

from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import PayrollPeriodViewSet, PayrollEntryViewSet

router = DefaultRouter()
router.register(r"periods", PayrollPeriodViewSet, basename="payrollperiod")
router.register(r"entries", PayrollEntryViewSet, basename="payrollentry")

urlpatterns = [
    path("", include(router.urls)),
]
