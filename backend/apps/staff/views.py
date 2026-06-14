"""
SIA HMS — Staff App Views
Defines DepartmentViewSet, StaffMemberViewSet, and StaffDocumentViewSet.
"""

from rest_framework import viewsets, filters
from django_filters.rest_framework import DjangoFilterBackend
from apps.accounts.permissions import IsPropertyManager, IsAnyStaff
from .models import Department, StaffMember, StaffDocument
from .serializers import DepartmentSerializer, StaffMemberSerializer, StaffDocumentSerializer


class DepartmentViewSet(viewsets.ModelViewSet):
    """
    CRUD for Departments.
    """
    queryset = Department.objects.all()
    serializer_class = DepartmentSerializer
    filter_backends = [filters.SearchFilter]
    search_fields = ["name"]

    def get_permissions(self):
        if self.action in ["list", "retrieve"]:
            return [IsAnyStaff()]
        return [IsPropertyManager()]


class StaffMemberViewSet(viewsets.ModelViewSet):
    """
    CRUD for Staff Members.
    """
    queryset = StaffMember.objects.select_related("user", "department").all()
    serializer_class = StaffMemberSerializer
    filter_backends = [DjangoFilterBackend, filters.SearchFilter, filters.OrderingFilter]
    filterset_fields = ["department", "employment_type", "salary_type", "is_active", "tax_filing_status"]
    search_fields = ["user__first_name", "user__last_name", "user__email", "designation", "emergency_contact_name"]
    ordering_fields = ["hire_date", "base_salary", "created_at"]

    def get_permissions(self):
        if self.action in ["list", "retrieve"]:
            return [IsAnyStaff()]
        return [IsPropertyManager()]


class StaffDocumentViewSet(viewsets.ModelViewSet):
    """
    CRUD for Staff Documents.
    """
    queryset = StaffDocument.objects.all()
    serializer_class = StaffDocumentSerializer
    filter_backends = [DjangoFilterBackend]
    filterset_fields = ["staff", "document_type"]

    def get_permissions(self):
        if self.action in ["list", "retrieve"]:
            return [IsAnyStaff()]
        return [IsPropertyManager()]
