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
