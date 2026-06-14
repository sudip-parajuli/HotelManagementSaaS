"""
SIA HMS — HR App URL Configuration
Routes for shifts, leaves, and attendance monitoring.
"""

from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import ShiftViewSet, LeaveTypeViewSet, LeaveBalanceViewSet, LeaveRequestViewSet, AttendanceViewSet

router = DefaultRouter()
router.register(r"shifts", ShiftViewSet, basename="shift")
router.register(r"leave-types", LeaveTypeViewSet, basename="leavetype")
router.register(r"leave-balances", LeaveBalanceViewSet, basename="leavebalance")
router.register(r"leave-requests", LeaveRequestViewSet, basename="leaverequest")
router.register(r"attendance", AttendanceViewSet, basename="attendance")

urlpatterns = [
    path("", include(router.urls)),
]
