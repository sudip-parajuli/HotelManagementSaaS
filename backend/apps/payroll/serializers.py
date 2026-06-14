"""
SIA HMS — Payroll App Serializers
Handles PayrollPeriod and PayrollEntry.
"""

from rest_framework import serializers
from apps.staff.serializers import StaffMemberSerializer
from .models import PayrollPeriod, PayrollEntry


class PayrollPeriodSerializer(serializers.ModelSerializer):
    entry_count = serializers.IntegerField(source="entries.count", read_only=True)
    month_display = serializers.SerializerMethodField()

    class Meta:
        model = PayrollPeriod
        fields = ["id", "month", "month_display", "year", "status", "entry_count", "created_at", "updated_at"]
        read_only_fields = ["id", "created_at", "updated_at"]

    def get_month_display(self, obj):
        import calendar
        return calendar.month_name[obj.month]


class PayrollEntrySerializer(serializers.ModelSerializer):
    staff_name = serializers.CharField(source="staff.user.get_full_name", read_only=True)
    staff_designation = serializers.CharField(source="staff.designation", read_only=True)
    staff_department = serializers.CharField(source="staff.department.name", read_only=True)

    class Meta:
        model = PayrollEntry
        fields = [
            "id",
            "period",
            "staff",
            "staff_name",
            "staff_designation",
            "staff_department",
            "working_days",
            "present_days",
            "absent_days",
            "leave_days",
            "basic_salary",
            "overtime_hours",
            "overtime_rate",
            "overtime_amount",
            "allowances",
            "deductions",
            "ssf_employee",
            "ssf_employer",
            "income_tax",
            "gross_salary",
            "total_deductions",
            "net_salary",
            "is_approved",
            "notes",
            "created_at",
            "updated_at",
        ]
        read_only_fields = [
            "id",
            "period",
            "staff",
            "working_days",
            "present_days",
            "absent_days",
            "leave_days",
            "basic_salary",
            "overtime_hours",
            "overtime_rate",
            "overtime_amount",
            "ssf_employee",
            "ssf_employer",
            "income_tax",
            "gross_salary",
            "total_deductions",
            "net_salary",
            "created_at",
            "updated_at",
        ]

    def validate_allowances(self, value):
        if not isinstance(value, list):
            raise serializers.ValidationError("Allowances must be a list of dictionaries.")
        for item in value:
            if not isinstance(item, dict) or "name" not in item or "amount" not in item:
                raise serializers.ValidationError("Each allowance must contain a 'name' and 'amount'.")
            try:
                float(item["amount"])
            except ValueError:
                raise serializers.ValidationError("Allowance amount must be a number.")
        return value

    def validate_deductions(self, value):
        if not isinstance(value, list):
            raise serializers.ValidationError("Deductions must be a list of dictionaries.")
        for item in value:
            if not isinstance(item, dict) or "name" not in item or "amount" not in item:
                raise serializers.ValidationError("Each deduction must contain a 'name' and 'amount'.")
            try:
                float(item["amount"])
            except ValueError:
                raise serializers.ValidationError("Deduction amount must be a number.")
        return value

    def update(self, instance, validated_data):
        # When manual allowances/deductions are updated, re-calculate gross, deductions, and net salary.
        allowances = validated_data.get("allowances", instance.allowances)
        deductions = validated_data.get("deductions", instance.deductions)
        
        allowance_sum = sum(float(item["amount"]) for item in allowances)
        deduction_sum = sum(float(item["amount"]) for item in deductions)
        
        # Calculate new gross, total deductions, and net salary
        # Gross = pro-rated base + overtime + allowances
        gross = float(instance.basic_salary) + float(instance.overtime_amount) + allowance_sum
        
        # We need to recompute progressive tax with updated allowances because allowances are taxable!
        # Basic taxable = base + overtime + allowances - ssf
        from decimal import Decimal
        from .calculator import get_nepal_income_tax
        
        monthly_taxable = max(
            0.0,
            float(instance.basic_salary) + float(instance.overtime_amount) + allowance_sum - float(instance.ssf_employee)
        )
        annual_taxable = Decimal(str(monthly_taxable)) * Decimal("12.0")
        annual_tax = get_nepal_income_tax(annual_taxable, instance.staff.tax_filing_status)
        monthly_tax = float(annual_tax) / 12.0
        
        total_ded = float(instance.ssf_employee) + monthly_tax + deduction_sum
        net = gross - total_ded
        
        instance.allowances = allowances
        instance.deductions = deductions
        instance.income_tax = round(Decimal(str(monthly_tax)), 2)
        instance.gross_salary = round(Decimal(str(gross)), 2)
        instance.total_deductions = round(Decimal(str(total_ded)), 2)
        instance.net_salary = round(Decimal(str(net)), 2)
        
        instance.is_approved = validated_data.get("is_approved", instance.is_approved)
        instance.notes = validated_data.get("notes", instance.notes)
        instance.save()
        
        return instance
