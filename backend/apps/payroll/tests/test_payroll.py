"""
SIA HMS — Payroll App Unit Tests
"""

import pytest
from django.urls import reverse
from rest_framework import status
from rest_framework.test import APIClient
from django_tenants.utils import schema_context
from rest_framework_simplejwt.tokens import RefreshToken
from django.utils import timezone
from decimal import Decimal

from apps.accounts.models import UserRole, User
from apps.staff.models import Department, StaffMember
from apps.hr.models import Attendance, AttendanceStatus
from apps.payroll.models import PayrollPeriod, PayrollEntry, PayrollPeriodStatus
from apps.tenants.models import Client, Domain

pytestmark = pytest.mark.django_db


@pytest.fixture
def test_tenant(db):
    # Clean up stale test data if any
    try:
        if Client.objects.filter(schema_name="test_pay_tenant").exists():
            with schema_context("test_pay_tenant"):
                User.objects.filter(username__in=["manager@paytest.com", "clerk@paytest.com"]).delete()
    except Exception:
        pass
    try:
        Domain.objects.filter(domain="pay-test.localhost").delete()
        Client.objects.filter(schema_name="test_pay_tenant").delete()
    except Exception:
        pass
    try:
        User.objects.filter(username__in=["manager@paytest.com", "clerk@paytest.com"]).delete()
    except Exception:
        pass

    client = Client.objects.create(
        schema_name="test_pay_tenant",
        name="Payroll Test Hotel",
        contact_email="pay_test@hotel.com",
    )
    domain = Domain.objects.create(
        domain="pay-test.localhost",
        tenant=client,
        is_primary=True,
    )
    yield client


@pytest.fixture
def tenant_manager(test_tenant):
    with schema_context(test_tenant.schema_name):
        user = User.objects.create(
            username="manager@paytest.com",
            email="manager@paytest.com",
            first_name="Payroll",
            last_name="Manager",
            role=UserRole.PROPERTY_MANAGER,
            is_active=True,
        )
        user.set_password("Password123!")
        user.save()
        return user


@pytest.fixture
def tenant_auth_client(test_tenant, tenant_manager):
    client = APIClient(HTTP_HOST="pay-test.localhost")
    refresh = RefreshToken.for_user(tenant_manager)
    client.credentials(HTTP_AUTHORIZATION=f"Bearer {str(refresh.access_token)}")
    return client


@pytest.fixture
def payroll_setup(test_tenant):
    with schema_context(test_tenant.schema_name):
        dept = Department.objects.create(name="Accounts")
        u = User.objects.create(
            username="clerk@paytest.com",
            email="clerk@paytest.com",
            first_name="Hari",
            last_name="Lal",
            role=UserRole.ACCOUNTANT
        )
        # Base salary = 60,000 NPR, Tax filing status = single
        staff = StaffMember.objects.create(
            user=u,
            department=dept,
            designation="Accountant Clerk",
            hire_date="2026-06-01",
            base_salary=60000,
            attendance_pin="4455",
            tax_filing_status="single"
        )
        return staff


class TestPayrollOperations:
    def test_run_payroll_cycle(self, test_tenant, tenant_auth_client, payroll_setup):
        staff = payroll_setup
        
        # 1. Create a few Attendance logs to simulate present & absent days in June 2026
        with schema_context(test_tenant.schema_name):
            # Total days in June = 30
            # Let's log 20 present days, 4 weekend days, 6 absences
            weekends = [6, 13, 20, 27]
            present_days = [d for d in range(1, 25) if d not in weekends][:20]
            for day in present_days:
                Attendance.objects.create(
                    staff=staff,
                    date=timezone.datetime(2026, 6, day).date(),
                    status=AttendanceStatus.PRESENT,
                    overtime_hours=1.0 # 1 hour overtime per present day = 20 hours total
                )
            for day in weekends: # Saturday weekend logs
                Attendance.objects.create(
                    staff=staff,
                    date=timezone.datetime(2026, 6, day).date(),
                    status=AttendanceStatus.WEEKEND
                )
                
            # Create period
            period = PayrollPeriod.objects.create(month=6, year=2026)
            
        # 2. Trigger calculation view
        url_calc = reverse("payrollperiod-calculate", kwargs={"pk": period.id})
        response = tenant_auth_client.post(url_calc)
        assert response.status_code == status.HTTP_200_OK
        
        with schema_context(test_tenant.schema_name):
            # Check PayrollEntry creation
            assert PayrollEntry.objects.filter(period=period, staff=staff).exists()
            entry = PayrollEntry.objects.get(period=period, staff=staff)
            
            # Check calculations:
            # 6 absences logged. Pro-rated basic = 60,000 - (60,000 * 6 / 30) = 48,000 NPR
            assert float(entry.basic_salary) == 48000.00
            
            # Overtime hours = 20. Overtime hourly rate = (60,000 / 200) * 1.5 = 450 NPR. Overtime amount = 20 * 450 = 9,000 NPR
            assert float(entry.overtime_hours) == 20.0
            assert float(entry.overtime_amount) == 9000.00
            
            # SSF Employee contribution = 11% of pro-rated basic = 11% of 48000 = 5,280 NPR
            assert float(entry.ssf_employee) == 5280.00
            
            # Tax calculations check: Gross taxable monthly = 48000 + 9000 - 5280 = 51720 NPR. Annualized = 620,640 NPR.
            # Single slabs annual: 500,000 @ 0%, next 120,640 @ 10% = 12064 NPR. Monthly tax = 12064 / 12 = 1005.33 NPR.
            assert float(entry.income_tax) == 1005.33
            
            # Gross = 48000 (basic) + 9000 (overtime) = 57,000 NPR
            assert float(entry.gross_salary) == 57000.00
            # Total deductions = 5280 (ssf) + 1005.33 (tax) = 6285.33 NPR
            assert float(entry.total_deductions) == 6285.33
            # Net = 57000 - 6285.33 = 50714.67 NPR
            assert float(entry.net_salary) == 50714.67

    def test_payslip_generation_stream(self, test_tenant, tenant_auth_client, payroll_setup):
        staff = payroll_setup
        with schema_context(test_tenant.schema_name):
            period = PayrollPeriod.objects.create(month=6, year=2026)
            entry = PayrollEntry.objects.create(
                period=period,
                staff=staff,
                working_days=26,
                present_days=26,
                basic_salary=60000,
                gross_salary=60000,
                ssf_employee=6600,
                income_tax=1000,
                total_deductions=7600,
                net_salary=52400
            )
            
        url = reverse("payrollentry-payslip", kwargs={"pk": entry.id})
        response = tenant_auth_client.get(url)
        # Verify WeasyPrint HTML/PDF stream or fallback rendering response
        assert response.status_code == status.HTTP_200_OK
        assert response.headers["Content-Type"] in ["application/pdf", "text/html"]
