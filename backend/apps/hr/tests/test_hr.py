"""
SIA HMS — HR App Unit Tests
"""

import pytest
from datetime import date, time
from django.urls import reverse
from rest_framework import status
from rest_framework.test import APIClient
from django_tenants.utils import schema_context
from rest_framework_simplejwt.tokens import RefreshToken
from django.utils import timezone

from apps.accounts.models import UserRole, User
from apps.staff.models import Department, StaffMember
from apps.hr.models import Shift, Attendance, LeaveType, LeaveBalance, LeaveRequest, AttendanceStatus, LeaveRequestStatus
from apps.tenants.models import Client, Domain

pytestmark = pytest.mark.django_db


@pytest.fixture
def test_tenant(db):
    # Clean up stale test data if any
    try:
        if Client.objects.filter(schema_name="test_hr_tenant").exists():
            with schema_context("test_hr_tenant"):
                User.objects.filter(username__in=["manager@hrtest.com", "staff@hrtest.com"]).delete()
    except Exception:
        pass
    try:
        Domain.objects.filter(domain="hr-test.localhost").delete()
        Client.objects.filter(schema_name="test_hr_tenant").delete()
    except Exception:
        pass
    try:
        User.objects.filter(username__in=["manager@hrtest.com", "staff@hrtest.com"]).delete()
    except Exception:
        pass

    client = Client.objects.create(
        schema_name="test_hr_tenant",
        name="HR Test Hotel",
        contact_email="hr_test@hotel.com",
    )
    domain = Domain.objects.create(
        domain="hr-test.localhost",
        tenant=client,
        is_primary=True,
    )
    yield client


@pytest.fixture
def tenant_manager(test_tenant):
    with schema_context(test_tenant.schema_name):
        user = User.objects.create(
            username="manager@hrtest.com",
            email="manager@hrtest.com",
            first_name="HR",
            last_name="Manager",
            role=UserRole.PROPERTY_MANAGER,
            is_active=True,
        )
        user.set_password("Password123!")
        user.save()
        return user


@pytest.fixture
def tenant_auth_client(test_tenant, tenant_manager):
    client = APIClient(HTTP_HOST="hr-test.localhost")
    refresh = RefreshToken.for_user(tenant_manager)
    client.credentials(HTTP_AUTHORIZATION=f"Bearer {str(refresh.access_token)}")
    return client


@pytest.fixture
def hr_setup(test_tenant, tenant_manager):
    with schema_context(test_tenant.schema_name):
        dept = Department.objects.create(name="Front Desk")
        u = User.objects.create(
            username="staff@hrtest.com",
            email="staff@hrtest.com",
            first_name="Ram",
            last_name="Prasad",
            role=UserRole.FRONT_DESK
        )
        staff = StaffMember.objects.create(
            user=u,
            department=dept,
            designation="Receptionist",
            hire_date="2026-06-01",
            base_salary=30000,
            attendance_pin="1122"
        )
        
        leave_type = LeaveType.objects.create(
            name="Casual Leave",
            days_per_year=12,
            is_paid=True
        )
        
        leave_balance = LeaveBalance.objects.create(
            staff=staff,
            leave_type=leave_type,
            year=2026,
            total=12,
            used=0,
            remaining=12
        )
        
        return dept, staff, leave_type, leave_balance


class TestHROperations:
    def test_shift_scheduling(self, test_tenant, tenant_auth_client, hr_setup):
        dept, staff, _, _ = hr_setup
        url = reverse("shift-list")
        payload = {
            "staff": staff.id,
            "date": "2026-06-15",
            "start_time": "09:00:00",
            "end_time": "17:00:00",
            "department": dept.id,
            "is_confirmed": True,
        }
        
        response = tenant_auth_client.post(url, payload, format="json")
        assert response.status_code == status.HTTP_201_CREATED
        assert response.data["is_confirmed"] is True
        
        with schema_context(test_tenant.schema_name):
            assert Shift.objects.filter(staff=staff, date="2026-06-15").exists()

    def test_attendance_clock_in_out(self, test_tenant, tenant_auth_client, hr_setup):
        _, staff, _, _ = hr_setup
        
        # Clock in
        url_in = reverse("attendance-clock-in")
        payload_in = {"staff_id": staff.id, "pin": "1122"}
        
        response = tenant_auth_client.post(url_in, payload_in, format="json")
        assert response.status_code == status.HTTP_200_OK
        assert response.data["status"] == "present"
        assert response.data["clock_in"] is not None
        
        # Clock out (manually override clock_in so we can simulate worked duration of > 8 hours)
        with schema_context(test_tenant.schema_name):
            attendance = Attendance.objects.get(staff=staff, date=timezone.localdate())
            # set check-in back by 9.5 hours to mock overtime
            attendance.clock_in = timezone.now() - timezone.timedelta(hours=9, minutes=30)
            attendance.save()
            
        url_out = reverse("attendance-clock-out")
        payload_out = {"staff_id": staff.id, "pin": "1122"}
        
        response = tenant_auth_client.post(url_out, payload_out, format="json")
        assert response.status_code == status.HTTP_200_OK
        assert response.data["clock_out"] is not None
        # Overtime = 9.5 - 8.0 = 1.5 hours
        assert float(response.data["overtime_hours"]) == 1.5

    def test_leave_request_approval(self, test_tenant, tenant_auth_client, hr_setup):
        _, staff, leave_type, leave_balance = hr_setup
        
        # Create Leave Request
        url_list = reverse("leaverequest-list")
        payload = {
            "staff": staff.id,
            "leave_type": leave_type.id,
            "start_date": "2026-06-15",
            "end_date": "2026-06-17",
            "reason": "Family vacation",
        }
        
        # Authenticate client as the staff user to request leave
        staff_client = APIClient(HTTP_HOST="hr-test.localhost")
        refresh = RefreshToken.for_user(staff.user)
        staff_client.credentials(HTTP_AUTHORIZATION=f"Bearer {str(refresh.access_token)}")
        
        response = staff_client.post(url_list, payload, format="json")
        assert response.status_code == status.HTTP_201_CREATED
        assert response.data["status"] == "pending"
        # Days = 15, 16, 17 = 3 days
        assert response.data["days"] == 3
        
        # Approve Leave Request (must be done by manager)
        url_approve = reverse("leaverequest-approve", kwargs={"pk": response.data["id"]})
        response_app = tenant_auth_client.post(url_approve)
        assert response_app.status_code == status.HTTP_200_OK
        assert response_app.data["status"] == "approved"
        
        with schema_context(test_tenant.schema_name):
            leave_balance.refresh_from_db()
            # Used days should become 3, remaining should be 9
            assert leave_balance.used == 3
            assert leave_balance.remaining == 9
            
            # Attendance entries for leave dates should be created automatically
            assert Attendance.objects.filter(staff=staff, date="2026-06-16", status="leave").exists()
