"""
SIA HMS — Nepal Tax Slabs and SSF progressive calculation tests
"""

import pytest
from decimal import Decimal
from django.urls import reverse
from rest_framework import status
from django_tenants.utils import schema_context
from apps.payroll.models import TaxSlab, SSFConfig, PayrollPeriod, PayrollEntry
from apps.payroll.calculator import get_nepal_income_tax, calculate_payroll_entry_data
from apps.staff.models import Department, StaffMember
from apps.accounts.models import User, UserRole

pytestmark = pytest.mark.django_db


@pytest.fixture
def test_tenant_with_slabs(test_tenant):
    """
    Seeding progressive tax slabs and SSF config in schema context of test_tenant.
    """
    with schema_context(test_tenant.schema_name):
        # Clean existing to be safe
        TaxSlab.objects.all().delete()
        SSFConfig.objects.all().delete()

        # Seed SSF Config
        SSFConfig.objects.create(
            fiscal_year="2081/82",
            employee_rate_percent=11.00,
            employer_rate_percent=20.00,
            is_active=True
        )

        # Seed progressive tax slabs for Single (FY 2081/82)
        TaxSlab.objects.create(fiscal_year="2081/82", filing_status="single", slab_order=1, min_amount=0, max_amount=500000, rate_percent=1)
        TaxSlab.objects.create(fiscal_year="2081/82", filing_status="single", slab_order=2, min_amount=500000, max_amount=700000, rate_percent=10)
        TaxSlab.objects.create(fiscal_year="2081/82", filing_status="single", slab_order=3, min_amount=700000, max_amount=1000000, rate_percent=20)
        TaxSlab.objects.create(fiscal_year="2081/82", filing_status="single", slab_order=4, min_amount=1000000, max_amount=2000000, rate_percent=30)
        TaxSlab.objects.create(fiscal_year="2081/82", filing_status="single", slab_order=5, min_amount=2000000, max_amount=5000000, rate_percent=36)
        TaxSlab.objects.create(fiscal_year="2081/82", filing_status="single", slab_order=6, min_amount=5000000, max_amount=None, rate_percent=39)

        # Seed progressive tax slabs for Married (FY 2081/82)
        TaxSlab.objects.create(fiscal_year="2081/82", filing_status="married", slab_order=1, min_amount=0, max_amount=600000, rate_percent=1)
        TaxSlab.objects.create(fiscal_year="2081/82", filing_status="married", slab_order=2, min_amount=600000, max_amount=800000, rate_percent=10)
        TaxSlab.objects.create(fiscal_year="2081/82", filing_status="married", slab_order=3, min_amount=800000, max_amount=1100000, rate_percent=20)
        TaxSlab.objects.create(fiscal_year="2081/82", filing_status="married", slab_order=4, min_amount=1100000, max_amount=2000000, rate_percent=30)
        TaxSlab.objects.create(fiscal_year="2081/82", filing_status="married", slab_order=5, min_amount=2000000, max_amount=5000000, rate_percent=36)
        TaxSlab.objects.create(fiscal_year="2081/82", filing_status="married", slab_order=6, min_amount=5000000, max_amount=None, rate_percent=39)
    return test_tenant


class TestNepalTaxBracketsCalculations:

    def test_progressive_tax_calculations_single(self, test_tenant_with_slabs):
        with schema_context(test_tenant_with_slabs.schema_name):
            # Test progressive tax for Single filing status (FY 2081/82)
            # Under 500k base (Slab 1): 1% is waived due to SSF -> 0 NPR
            tax = get_nepal_income_tax(Decimal("450000"), "single", "2081/82")
            assert tax == Decimal("0.00")

            # 650k taxable: 500k @ 0%, next 150k @ 10% = 15k NPR
            tax = get_nepal_income_tax(Decimal("650000"), "single", "2081/82")
            assert tax == Decimal("15000.00")

            # 850k taxable: 500k @ 0%, next 200k @ 10% (20k), next 150k @ 20% (30k) = 50k NPR
            tax = get_nepal_income_tax(Decimal("850000"), "single", "2081/82")
            assert tax == Decimal("50000.00")

            # 1.5M taxable: 500k @ 0%, 200k @ 10% (20k), 300k @ 20% (60k), 500k @ 30% (150k) = 230k NPR
            tax = get_nepal_income_tax(Decimal("1500000"), "single", "2081/82")
            assert tax == Decimal("230000.00")

    def test_progressive_tax_calculations_married(self, test_tenant_with_slabs):
        with schema_context(test_tenant_with_slabs.schema_name):
            # Test progressive tax for Married filing status (FY 2081/82)
            # Under 600k base (Slab 1): 1% is waived due to SSF -> 0 NPR
            tax = get_nepal_income_tax(Decimal("550000"), "married", "2081/82")
            assert tax == Decimal("0.00")

            # 750k taxable: 600k @ 0%, next 150k @ 10% = 15k NPR
            tax = get_nepal_income_tax(Decimal("750000"), "married", "2081/82")
            assert tax == Decimal("15000.00")

            # 1.5M taxable: 600k @ 0%, 200k @ 10% (20k), 300k @ 20% (60k), 400k @ 30% (120k) = 200k NPR
            tax = get_nepal_income_tax(Decimal("1500000"), "married", "2081/82")
            assert tax == Decimal("200000.00")

    def test_dynamic_ssf_rate_change(self, test_tenant_with_slabs):
        """
        Verify that changing SSFConfig rates updates payroll calculation.
        """
        with schema_context(test_tenant_with_slabs.schema_name):
            # Setup staff member
            dept = Department.objects.create(name="Support")
            u = User.objects.create(
                username="support_clerk@paytest.com",
                email="support_clerk@paytest.com",
                role=UserRole.FRONT_DESK
            )
            staff = StaffMember.objects.create(
                user=u,
                department=dept,
                designation="Receptionist",
                hire_date="2026-06-01",
                base_salary=50000,
                attendance_pin="1122",
                tax_filing_status="single"
            )

            # 1. Perform calculation with standard SSF (11% / 20%)
            # June 2026 is month 6, year 2026 (translates to FY 2081/82 under offset helper)
            data = calculate_payroll_entry_data(staff, 6, 2026)
            # Default fallback when no logs exist: 26 absences pro-rates basic to 6,666.67
            # 11% of 6,666.67 = 733.33 NPR
            assert data["ssf_employee"] == Decimal("733.33")
            assert data["ssf_employer"] == Decimal("1333.33")

            # 2. Modify SSFConfig to 12% / 22%
            cfg = SSFConfig.objects.get(fiscal_year="2081/82")
            cfg.employee_rate_percent = Decimal("12.00")
            cfg.employer_rate_percent = Decimal("22.00")
            cfg.save()

            # 3. Recalculate and assert updated values
            data2 = calculate_payroll_entry_data(staff, 6, 2026)
            # 12% of 6,666.67 = 800.00 NPR
            assert data2["ssf_employee"] == Decimal("800.00")
            assert data2["ssf_employer"] == Decimal("1466.67")

    def test_superadmin_tax_config_api(self, api_client, super_admin, test_tenant_with_slabs):
        api_client.force_authenticate(user=super_admin)
        url = reverse("admin-tax-config")
        
        # 1. GET request
        response = api_client.get(url)
        assert response.status_code == status.HTTP_200_OK
        assert "tax_slabs" in response.data
        assert "ssf_config" in response.data
        assert len(response.data["tax_slabs"]) > 0
        assert len(response.data["ssf_config"]) > 0

        # 2. POST request (update configuration)
        new_slabs = [
            {"fiscal_year": "2081/82", "filing_status": "single", "slab_order": 1, "min_amount": 0, "max_amount": 550000, "rate_percent": 1},
        ]
        new_ssf = [
            {"fiscal_year": "2081/82", "employee_rate_percent": 12.50, "employer_rate_percent": 21.50, "is_active": True}
        ]
        payload = {
            "tax_slabs": new_slabs,
            "ssf_config": new_ssf
        }
        
        response = api_client.post(url, payload, format="json")
        assert response.status_code == status.HTTP_200_OK
        
        # Verify changes in tenant context
        with schema_context(test_tenant_with_slabs.schema_name):
            assert TaxSlab.objects.filter(fiscal_year="2081/82", filing_status="single").count() == 1
            slab = TaxSlab.objects.get(fiscal_year="2081/82", filing_status="single", slab_order=1)
            assert float(slab.max_amount) == 550000.00
            
            ssf = SSFConfig.objects.get(fiscal_year="2081/82")
            assert float(ssf.employee_rate_percent) == 12.50

