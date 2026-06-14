"""
SIA HMS — Staff App Unit Tests
"""

import pytest
from django.urls import reverse
from rest_framework import status
from rest_framework.test import APIClient
from django_tenants.utils import schema_context
from rest_framework_simplejwt.tokens import RefreshToken

from apps.accounts.models import UserRole, User
from apps.staff.models import Department, StaffMember, StaffDocument
from apps.tenants.models import Client, Domain

pytestmark = pytest.mark.django_db


@pytest.fixture
def test_tenant(db):
    # Clean up stale test data if any
    try:
        if Client.objects.filter(schema_name="test_staff_tenant").exists():
            with schema_context("test_staff_tenant"):
                User.objects.filter(username__in=["manager@stafftest.com", "waiter@stafftest.com", "officer@stafftest.com"]).delete()
    except Exception:
        pass
    try:
        Domain.objects.filter(domain="staff-test.localhost").delete()
        Client.objects.filter(schema_name="test_staff_tenant").delete()
    except Exception:
        pass
    try:
        User.objects.filter(username__in=["manager@stafftest.com", "waiter@stafftest.com", "officer@stafftest.com"]).delete()
    except Exception:
        pass

    client = Client.objects.create(
        schema_name="test_staff_tenant",
        name="Staff Test Hotel",
        contact_email="staff_test@hotel.com",
    )
    domain = Domain.objects.create(
        domain="staff-test.localhost",
        tenant=client,
        is_primary=True,
    )
    yield client


@pytest.fixture
def tenant_manager(test_tenant):
    with schema_context(test_tenant.schema_name):
        user = User.objects.create(
            username="manager@stafftest.com",
            email="manager@stafftest.com",
            first_name="Manager",
            last_name="Staff",
            role=UserRole.PROPERTY_MANAGER,
            is_active=True,
        )
        user.set_password("Password123!")
        user.save()
        return user


@pytest.fixture
def tenant_auth_client(test_tenant, tenant_manager):
    client = APIClient(HTTP_HOST="staff-test.localhost")
    refresh = RefreshToken.for_user(tenant_manager)
    client.credentials(HTTP_AUTHORIZATION=f"Bearer {str(refresh.access_token)}")
    return client


class TestStaffOperations:
    def test_department_crud(self, test_tenant, tenant_auth_client):
        url = reverse("department-list")
        payload = {"name": "Front Office"}
        
        # Create
        response = tenant_auth_client.post(url, payload, format="json")
        assert response.status_code == status.HTTP_201_CREATED
        assert response.data["name"] == "Front Office"
        
        # List
        response = tenant_auth_client.get(url)
        assert response.status_code == status.HTTP_200_OK
        assert len(response.data["results"]) == 1

    def test_staff_member_creation(self, test_tenant, tenant_auth_client):
        with schema_context(test_tenant.schema_name):
            dept = Department.objects.create(name="F&B Service")
            
        url = reverse("staffmember-list")
        payload = {
            "user": {
                "email": "waiter@stafftest.com",
                "first_name": "Ram",
                "last_name": "Bahadur",
                "phone": "9876543210",
                "role": "RESTAURANT_STAFF",
                "password": "Password123!",
                "is_active": True
            },
            "department": dept.id,
            "designation": "Waiter",
            "hire_date": "2026-06-01",
            "employment_type": "full_time",
            "base_salary": "25000.00",
            "salary_type": "monthly",
            "tax_filing_status": "single",
            "attendance_pin": "5566",
            "is_active": True
        }
        
        response = tenant_auth_client.post(url, payload, format="json")
        assert response.status_code == status.HTTP_201_CREATED
        assert response.data["designation"] == "Waiter"
        assert response.data["email"] == "waiter@stafftest.com"
        
        with schema_context(test_tenant.schema_name):
            assert StaffMember.objects.filter(designation="Waiter").exists()
            assert User.objects.filter(email="waiter@stafftest.com").exists()

    def test_staff_member_update(self, test_tenant, tenant_auth_client):
        with schema_context(test_tenant.schema_name):
            dept = Department.objects.create(name="HR Dept")
            u = User.objects.create(
                username="officer@stafftest.com",
                email="officer@stafftest.com",
                first_name="Sita",
                last_name="Sharma",
                role=UserRole.FRONT_DESK
            )
            staff = StaffMember.objects.create(
                user=u,
                department=dept,
                designation="HR Officer",
                hire_date="2026-01-01",
                base_salary=45000,
                attendance_pin="9988"
            )
            
        url = reverse("staffmember-detail", kwargs={"pk": staff.id})
        payload = {
            "user": {
                "first_name": "Sita Updated",
                "last_name": "Sharma",
                "phone": "9800000000",
                "role": "FRONT_DESK"
            },
            "department": dept.id,
            "designation": "Senior HR Officer",
            "hire_date": "2026-01-01",
            "employment_type": "full_time",
            "base_salary": "50000.00",
            "salary_type": "monthly",
            "attendance_pin": "9988"
        }
        
        response = tenant_auth_client.put(url, payload, format="json")
        assert response.status_code == status.HTTP_200_OK
        assert response.data["designation"] == "Senior HR Officer"
        assert response.data["user"]["first_name"] == "Sita Updated"
