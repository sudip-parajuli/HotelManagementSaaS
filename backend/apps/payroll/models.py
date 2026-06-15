"""
SIA HMS — Payroll App Models
Defines PayrollPeriod and PayrollEntry.
"""

from django.db import models
from django.conf import settings
from apps.staff.models import StaffMember


class PayrollPeriodStatus(models.TextChoices):
    DRAFT = "draft", "Draft"
    PROCESSING = "processing", "Processing"
    APPROVED = "approved", "Approved"
    PAID = "paid", "Paid"


class PayrollPeriod(models.Model):
    """
    Represents a monthly payroll cycle.
    """
    month = models.IntegerField(help_text="Month of the cycle (1-12)")
    year = models.IntegerField(help_text="Year of the cycle (e.g., 2026)")
    status = models.CharField(
        max_length=20,
        choices=PayrollPeriodStatus.choices,
        default=PayrollPeriodStatus.DRAFT,
    )
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        verbose_name = "Payroll Period"
        verbose_name_plural = "Payroll Periods"
        unique_together = ("month", "year")
        ordering = ["-year", "-month"]

    def __str__(self):
        import calendar
        month_name = calendar.month_name[self.month]
        return f"{month_name} {self.year} ({self.status})"


class PayrollEntry(models.Model):
    """
    Represents calculated payroll metrics for a specific staff member during a period.
    """
    period = models.ForeignKey(
        PayrollPeriod,
        on_delete=models.CASCADE,
        related_name="entries",
    )
    staff = models.ForeignKey(
        StaffMember,
        on_delete=models.CASCADE,
        related_name="payroll_entries",
    )
    
    # Attendance breakdown for the month
    working_days = models.DecimalField(max_digits=4, decimal_places=1, default=0.0)
    present_days = models.DecimalField(max_digits=4, decimal_places=1, default=0.0)
    absent_days = models.DecimalField(max_digits=4, decimal_places=1, default=0.0)
    leave_days = models.DecimalField(max_digits=4, decimal_places=1, default=0.0)
    
    # Financial details
    basic_salary = models.DecimalField(max_digits=10, decimal_places=2, default=0.00)
    overtime_hours = models.DecimalField(max_digits=5, decimal_places=2, default=0.00)
    overtime_rate = models.DecimalField(max_digits=8, decimal_places=2, default=0.00)
    overtime_amount = models.DecimalField(max_digits=10, decimal_places=2, default=0.00)
    
    # Allowances & Deductions details (format: [{'name': '...', 'amount': 100}])
    allowances = models.JSONField(default=list, blank=True)
    deductions = models.JSONField(default=list, blank=True)
    
    # Social Security Fund (Nepal rules)
    ssf_employee = models.DecimalField(max_digits=10, decimal_places=2, default=0.00)
    ssf_employer = models.DecimalField(max_digits=10, decimal_places=2, default=0.00)
    
    # Tax & Salary aggregates
    income_tax = models.DecimalField(max_digits=10, decimal_places=2, default=0.00)
    gross_salary = models.DecimalField(max_digits=10, decimal_places=2, default=0.00)
    total_deductions = models.DecimalField(max_digits=10, decimal_places=2, default=0.00)
    net_salary = models.DecimalField(max_digits=10, decimal_places=2, default=0.00)
    
    is_approved = models.BooleanField(default=False)
    approved_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="approved_payroll_entries",
    )
    notes = models.TextField(blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        verbose_name = "Payroll Entry"
        verbose_name_plural = "Payroll Entries"
        unique_together = ("period", "staff")
        ordering = ["staff"]

    def __str__(self):
        return f"{self.staff} — {self.period}"


class TaxSlab(models.Model):
    """
    Configurable tax slabs for Nepal Income Tax calculations.
    """
    STATUS_CHOICES = [
        ("single", "Single"),
        ("married", "Married"),
    ]
    fiscal_year = models.CharField(max_length=10, help_text="e.g., 2081/82")
    filing_status = models.CharField(max_length=15, choices=STATUS_CHOICES, default="single")
    slab_order = models.IntegerField(help_text="Order of the tax slab (1, 2, 3...)")
    min_amount = models.DecimalField(max_digits=12, decimal_places=2)
    max_amount = models.DecimalField(max_digits=12, decimal_places=2, null=True, blank=True)
    rate_percent = models.DecimalField(max_digits=5, decimal_places=2)

    class Meta:
        verbose_name = "Tax Slab"
        verbose_name_plural = "Tax Slabs"
        ordering = ["fiscal_year", "filing_status", "slab_order"]
        unique_together = ("fiscal_year", "filing_status", "slab_order")

    def __str__(self):
        max_str = f"{self.max_amount}" if self.max_amount else "Above"
        return f"{self.fiscal_year} — {self.filing_status} Slab {self.slab_order}: {self.min_amount} to {max_str} @ {self.rate_percent}%"


class SSFConfig(models.Model):
    """
    Social Security Fund (SSF) configuration rates.
    """
    fiscal_year = models.CharField(max_length=10, unique=True, help_text="e.g., 2081/82")
    employee_rate_percent = models.DecimalField(max_digits=5, decimal_places=2, default=11.00)
    employer_rate_percent = models.DecimalField(max_digits=5, decimal_places=2, default=20.00)
    is_active = models.BooleanField(default=True)

    class Meta:
        verbose_name = "SSF Configuration"
        verbose_name_plural = "SSF Configurations"
        ordering = ["-fiscal_year"]

    def __str__(self):
        return f"SSF {self.fiscal_year}: Employee {self.employee_rate_percent}% / Employer {self.employer_rate_percent}%"

