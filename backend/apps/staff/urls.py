"""
SIA HMS — Staff App URL Configuration
Routes for departments, staff members, and staff documents.
"""

from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import DepartmentViewSet, StaffMemberViewSet, StaffDocumentViewSet

router = DefaultRouter()
router.register(r"departments", DepartmentViewSet, basename="department")
router.register(r"members", StaffMemberViewSet, basename="staffmember")
router.register(r"documents", StaffDocumentViewSet, basename="staffdocument")

urlpatterns = [
    path("", include(router.urls)),
]
