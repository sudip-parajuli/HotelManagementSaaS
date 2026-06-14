"""
SIA HMS — HR App Models
Defines Shift, Attendance, LeaveType, LeaveBalance, and LeaveRequest.
"""

from django.db import models
from django.conf import settings
from apps.staff.models import StaffMember, Department


class Shift(models.Model):
    """
    Represents an employee shift schedule for a specific day.
    """
    staff = models.ForeignKey(
        StaffMember,
        on_delete=models.CASCADE,
        related_name="shifts",
    )
    date = models.DateField()
    start_time = models.TimeField()
    end_time = models.TimeField()
    department = models.ForeignKey(
        Department,
        on_delete=models.CASCADE,
        related_name="shifts",
    )
    is_confirmed = models.BooleanField(default=False)
    notes = models.TextField(blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        verbose_name = "Shift"
        verbose_name_plural = "Shifts"
        ordering = ["date", "start_time"]
        indexes = [
            models.Index(fields=["staff", "date"]),
            models.Index(fields=["date"]),
        ]

    def __str__(self):
        return f"Shift for {self.staff} on {self.date} ({self.start_time} - {self.end_time})"


class AttendanceStatus(models.TextChoices):
    PRESENT = "present", "Present"
    ABSENT = "absent", "Absent"
    HALF_DAY = "half_day", "Half Day"
    LEAVE = "leave", "On Leave"
    HOLIDAY = "holiday", "Public Holiday"
    WEEKEND = "weekend", "Weekend"


class Attendance(models.Model):
    """
    Represents daily clock-in/out attendance metrics for staff.
    """
    staff = models.ForeignKey(
        StaffMember,
        on_delete=models.CASCADE,
        related_name="attendances",
    )
    date = models.DateField()
    clock_in = models.DateTimeField(null=True, blank=True)
    clock_out = models.DateTimeField(null=True, blank=True)
    status = models.CharField(
        max_length=20,
        choices=AttendanceStatus.choices,
        default=AttendanceStatus.ABSENT,
    )
    clock_in_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="logged_attendances",
    )
    overtime_hours = models.DecimalField(
        max_digits=4,
        decimal_places=2,
        default=0.00,
    )
    notes = models.TextField(blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        verbose_name = "Attendance Record"
        verbose_name_plural = "Attendance Records"
        ordering = ["-date", "staff"]
        unique_together = ("staff", "date")
        indexes = [
            models.Index(fields=["staff", "date"]),
            models.Index(fields=["date"]),
        ]

    def __str__(self):
        return f"{self.staff} on {self.date} — {self.status}"


class LeaveType(models.Model):
    """
    Represents types of leave (e.g., Casual Leave, Sick Leave, Maternity Leave).
    """
    name = models.CharField(max_length=50, unique=True)
    days_per_year = models.IntegerField()
    is_paid = models.BooleanField(default=True)
    carry_forward_limit = models.IntegerField(default=0)

    class Meta:
        verbose_name = "Leave Type"
        verbose_name_plural = "Leave Types"
        ordering = ["name"]

    def __str__(self):
        return self.name


class LeaveBalance(models.Model):
    """
    Represents an employee's remaining leave balance for a specific fiscal/calendar year.
    """
    staff = models.ForeignKey(
        StaffMember,
        on_delete=models.CASCADE,
        related_name="leave_balances",
    )
    leave_type = models.ForeignKey(LeaveType, on_delete=models.CASCADE)
    year = models.IntegerField()
    total = models.IntegerField()
    used = models.IntegerField(default=0)
    remaining = models.IntegerField()

    class Meta:
        verbose_name = "Leave Balance"
        verbose_name_plural = "Leave Balances"
        unique_together = ("staff", "leave_type", "year")
        ordering = ["year", "staff"]

    def __str__(self):
        return f"{self.staff} — {self.leave_type} ({self.year}): {self.remaining}/{self.total} remaining"

    def save(self, *args, **kwargs):
        self.remaining = self.total - self.used
        super().save(*args, **kwargs)


class LeaveRequestStatus(models.TextChoices):
    PENDING = "pending", "Pending"
    APPROVED = "approved", "Approved"
    REJECTED = "rejected", "Rejected"


class LeaveRequest(models.Model):
    """
    Represents a request for taking leave.
    """
    staff = models.ForeignKey(
        StaffMember,
        on_delete=models.CASCADE,
        related_name="leave_requests",
    )
    leave_type = models.ForeignKey(LeaveType, on_delete=models.CASCADE)
    start_date = models.DateField()
    end_date = models.DateField()
    days = models.IntegerField()
    reason = models.TextField()
    status = models.CharField(
        max_length=20,
        choices=LeaveRequestStatus.choices,
        default=LeaveRequestStatus.PENDING,
    )
    
    approved_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="approved_leave_requests",
    )
    approved_at = models.DateTimeField(null=True, blank=True)
    rejection_reason = models.TextField(blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        verbose_name = "Leave Request"
        verbose_name_plural = "Leave Requests"
        ordering = ["-created_at"]
        indexes = [
            models.Index(fields=["staff"]),
            models.Index(fields=["status"]),
        ]

    def __str__(self):
        return f"{self.staff} — {self.leave_type} ({self.start_date} to {self.end_date}) — {self.status}"
