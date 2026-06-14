"""
SIA HMS — HR App Serializers
Handles Shift, Attendance, LeaveType, LeaveBalance, and LeaveRequest.
"""

from rest_framework import serializers
from apps.staff.serializers import StaffMemberSerializer
from .models import Shift, Attendance, LeaveType, LeaveBalance, LeaveRequest


class ShiftSerializer(serializers.ModelSerializer):
    staff_name = serializers.CharField(source="staff.user.get_full_name", read_only=True)
    department_name = serializers.CharField(source="department.name", read_only=True)

    class Meta:
        model = Shift
        fields = [
            "id",
            "staff",
            "staff_name",
            "date",
            "start_time",
            "end_time",
            "department",
            "department_name",
            "is_confirmed",
            "notes",
            "created_at",
            "updated_at",
        ]
        read_only_fields = ["id", "created_at", "updated_at"]


class AttendanceSerializer(serializers.ModelSerializer):
    staff_name = serializers.CharField(source="staff.user.get_full_name", read_only=True)
    clock_in_by_name = serializers.CharField(source="clock_in_by.get_full_name", read_only=True)

    class Meta:
        model = Attendance
        fields = [
            "id",
            "staff",
            "staff_name",
            "date",
            "clock_in",
            "clock_out",
            "status",
            "clock_in_by",
            "clock_in_by_name",
            "overtime_hours",
            "notes",
            "created_at",
            "updated_at",
        ]
        read_only_fields = ["id", "created_at", "updated_at"]


class LeaveTypeSerializer(serializers.ModelSerializer):
    class Meta:
        model = LeaveType
        fields = ["id", "name", "days_per_year", "is_paid", "carry_forward_limit"]
        read_only_fields = ["id"]


class LeaveBalanceSerializer(serializers.ModelSerializer):
    staff_name = serializers.CharField(source="staff.user.get_full_name", read_only=True)
    leave_type_name = serializers.CharField(source="leave_type.name", read_only=True)

    class Meta:
        model = LeaveBalance
        fields = [
            "id",
            "staff",
            "staff_name",
            "leave_type",
            "leave_type_name",
            "year",
            "total",
            "used",
            "remaining",
        ]
        read_only_fields = ["id", "remaining"]


class LeaveRequestSerializer(serializers.ModelSerializer):
    staff_name = serializers.CharField(source="staff.user.get_full_name", read_only=True)
    leave_type_name = serializers.CharField(source="leave_type.name", read_only=True)
    approved_by_name = serializers.CharField(source="approved_by.get_full_name", read_only=True)

    class Meta:
        model = LeaveRequest
        fields = [
            "id",
            "staff",
            "staff_name",
            "leave_type",
            "leave_type_name",
            "start_date",
            "end_date",
            "days",
            "reason",
            "status",
            "approved_by",
            "approved_by_name",
            "approved_at",
            "rejection_reason",
            "created_at",
            "updated_at",
        ]
        read_only_fields = ["id", "days", "status", "approved_by", "approved_at", "created_at", "updated_at"]

    def validate(self, attrs):
        start_date = attrs.get("start_date")
        end_date = attrs.get("end_date")
        
        if start_date > end_date:
            raise serializers.ValidationError("Start date must be before or equal to end date.")
        
        # Calculate requested days
        days = (end_date - start_date).days + 1
        attrs["days"] = days
        
        staff = attrs.get("staff")
        leave_type = attrs.get("leave_type")
        year = start_date.year

        # Check if leave balance is configured
        try:
            balance = LeaveBalance.objects.get(staff=staff, leave_type=leave_type, year=year)
            if balance.remaining < days:
                raise serializers.ValidationError(
                    f"Insufficient leave balance. Remaining: {balance.remaining}, Requested: {days}"
                )
        except LeaveBalance.DoesNotExist:
            raise serializers.ValidationError(
                f"No leave balance allocated for this staff, leave type, and year ({year})."
            )
            
        return attrs
