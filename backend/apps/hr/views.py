"""
SIA HMS — HR App Views
Defines ShiftViewSet, LeaveTypeViewSet, LeaveBalanceViewSet, LeaveRequestViewSet, and AttendanceViewSet.
"""

from decimal import Decimal
from datetime import timedelta
from django.utils import timezone
from django.db import transaction
from django_filters.rest_framework import DjangoFilterBackend
from rest_framework import viewsets, status, filters
from rest_framework.decorators import action
from rest_framework.response import Response
from apps.accounts.permissions import IsPropertyManager, IsAnyStaff
from .models import Shift, Attendance, LeaveType, LeaveBalance, LeaveRequest, AttendanceStatus, LeaveRequestStatus
from .serializers import (
    ShiftSerializer,
    AttendanceSerializer,
    LeaveTypeSerializer,
    LeaveBalanceSerializer,
    LeaveRequestSerializer,
)


class ShiftViewSet(viewsets.ModelViewSet):
    """
    CRUD for Shifts.
    """
    queryset = Shift.objects.select_related("staff__user", "department").all()
    serializer_class = ShiftSerializer
    filter_backends = [DjangoFilterBackend, filters.OrderingFilter]
    filterset_fields = ["staff", "date", "department", "is_confirmed"]
    ordering_fields = ["date", "start_time"]

    def get_permissions(self):
        if self.action in ["list", "retrieve"]:
            return [IsAnyStaff()]
        return [IsPropertyManager()]

    def get_queryset(self):
        queryset = super().get_queryset()
        start_date = self.request.query_params.get("start_date")
        end_date = self.request.query_params.get("end_date")
        if start_date:
            queryset = queryset.filter(date__gte=start_date)
        if end_date:
            queryset = queryset.filter(date__lte=end_date)
        return queryset


class LeaveTypeViewSet(viewsets.ModelViewSet):
    """
    CRUD for Leave Types.
    """
    queryset = LeaveType.objects.all()
    serializer_class = LeaveTypeSerializer

    def get_permissions(self):
        if self.action in ["list", "retrieve"]:
            return [IsAnyStaff()]
        return [IsPropertyManager()]


class LeaveBalanceViewSet(viewsets.ModelViewSet):
    """
    CRUD for Leave Balances.
    """
    queryset = LeaveBalance.objects.select_related("staff__user", "leave_type").all()
    serializer_class = LeaveBalanceSerializer
    filter_backends = [DjangoFilterBackend]
    filterset_fields = ["staff", "year", "leave_type"]

    def get_permissions(self):
        if self.action in ["list", "retrieve"]:
            return [IsAnyStaff()]
        return [IsPropertyManager()]


class LeaveRequestViewSet(viewsets.ModelViewSet):
    """
    CRUD for Leave Requests.
    """
    queryset = LeaveRequest.objects.select_related("staff__user", "leave_type", "approved_by").all()
    serializer_class = LeaveRequestSerializer
    filter_backends = [DjangoFilterBackend, filters.OrderingFilter]
    filterset_fields = ["staff", "leave_type", "status"]
    ordering_fields = ["start_date", "created_at"]

    def get_permissions(self):
        if self.action in ["list", "retrieve", "create"]:
            return [IsAnyStaff()]
        return [IsPropertyManager()]

    def perform_create(self, serializer):
        # Default saved leave request is pending
        serializer.save(staff=self.request.user.staff_profile)

    @action(detail=True, methods=["post"], permission_classes=[IsPropertyManager])
    def approve(self, request, pk=None):
        leave_request = self.get_object()
        if leave_request.status != LeaveRequestStatus.PENDING:
            return Response(
                {"error": "Leave request is already processed."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        with transaction.atomic():
            # Update request
            leave_request.status = LeaveRequestStatus.APPROVED
            leave_request.approved_by = request.user
            leave_request.approved_at = timezone.now()
            leave_request.save()

            # Update LeaveBalance
            year = leave_request.start_date.year
            try:
                balance = LeaveBalance.objects.get(
                    staff=leave_request.staff,
                    leave_type=leave_request.leave_type,
                    year=year,
                )
                balance.used += leave_request.days
                balance.save()
            except LeaveBalance.DoesNotExist:
                # If balance does not exist, build one
                LeaveBalance.objects.create(
                    staff=leave_request.staff,
                    leave_type=leave_request.leave_type,
                    year=year,
                    total=leave_request.leave_type.days_per_year,
                    used=leave_request.days,
                )

            # Create/Update Attendance records for the leave period
            curr_date = leave_request.start_date
            while curr_date <= leave_request.end_date:
                Attendance.objects.update_or_create(
                    staff=leave_request.staff,
                    date=curr_date,
                    defaults={
                        "status": AttendanceStatus.LEAVE,
                        "notes": f"On approved leave: {leave_request.leave_type.name}",
                    },
                )
                curr_date += timedelta(days=1)

        return Response(LeaveRequestSerializer(leave_request).data)

    @action(detail=True, methods=["post"], permission_classes=[IsPropertyManager])
    def reject(self, request, pk=None):
        leave_request = self.get_object()
        if leave_request.status != LeaveRequestStatus.PENDING:
            return Response(
                {"error": "Leave request is already processed."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        reason = request.data.get("rejection_reason")
        if not reason:
            return Response(
                {"error": "Rejection reason is required."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        leave_request.status = LeaveRequestStatus.REJECTED
        leave_request.rejection_reason = reason
        leave_request.approved_by = request.user
        leave_request.approved_at = timezone.now()
        leave_request.save()

        return Response(LeaveRequestSerializer(leave_request).data)


class AttendanceViewSet(viewsets.ModelViewSet):
    """
    CRUD for Attendance records, including quick PIN clock-in/out mechanisms.
    """
    queryset = Attendance.objects.select_related("staff__user", "clock_in_by").all()
    serializer_class = AttendanceSerializer
    filter_backends = [DjangoFilterBackend, filters.OrderingFilter]
    filterset_fields = ["staff", "date", "status"]
    ordering_fields = ["date", "clock_in"]

    def get_permissions(self):
        if self.action in ["list", "retrieve", "clock_in", "clock_out"]:
            return [IsAnyStaff()]
        return [IsPropertyManager()]

    def get_queryset(self):
        queryset = super().get_queryset()
        start_date = self.request.query_params.get("start_date")
        end_date = self.request.query_params.get("end_date")
        if start_date:
            queryset = queryset.filter(date__gte=start_date)
        if end_date:
            queryset = queryset.filter(date__lte=end_date)
        return queryset

    @action(detail=False, methods=["post"], permission_classes=[IsAnyStaff])
    def clock_in(self, request):
        staff_id = request.data.get("staff_id")
        pin = request.data.get("pin")
        if not staff_id or not pin:
            return Response(
                {"error": "staff_id and pin are required."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        from apps.staff.models import StaffMember
        try:
            staff = StaffMember.objects.get(pk=staff_id, is_active=True)
        except StaffMember.DoesNotExist:
            return Response(
                {"error": "Staff member not found or inactive."},
                status=status.HTTP_404_NOT_FOUND,
            )

        if staff.attendance_pin != pin:
            return Response(
                {"error": "Invalid PIN."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        today = timezone.localdate()
        now = timezone.now()

        attendance, created = Attendance.objects.get_or_create(
            staff=staff,
            date=today,
            defaults={
                "clock_in": now,
                "status": AttendanceStatus.PRESENT,
                "clock_in_by": request.user if request.user.is_authenticated else None,
            },
        )

        if not created:
            if attendance.clock_in:
                return Response(
                    {"error": "Already clocked in today."},
                    status=status.HTTP_400_BAD_REQUEST,
                )
            else:
                attendance.clock_in = now
                attendance.status = AttendanceStatus.PRESENT
                attendance.save()

        return Response(AttendanceSerializer(attendance).data)

    @action(detail=False, methods=["post"], permission_classes=[IsAnyStaff])
    def clock_out(self, request):
        staff_id = request.data.get("staff_id")
        pin = request.data.get("pin")
        if not staff_id or not pin:
            return Response(
                {"error": "staff_id and pin are required."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        from apps.staff.models import StaffMember
        try:
            staff = StaffMember.objects.get(pk=staff_id, is_active=True)
        except StaffMember.DoesNotExist:
            return Response(
                {"error": "Staff member not found or inactive."},
                status=status.HTTP_404_NOT_FOUND,
            )

        if staff.attendance_pin != pin:
            return Response(
                {"error": "Invalid PIN."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        today = timezone.localdate()
        now = timezone.now()

        try:
            attendance = Attendance.objects.get(staff=staff, date=today)
        except Attendance.DoesNotExist:
            return Response(
                {"error": "No clock-in record found for today."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        if not attendance.clock_in:
            return Response(
                {"error": "No clock-in record found for today."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        if attendance.clock_out:
            return Response(
                {"error": "Already clocked out today."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        attendance.clock_out = now

        # Calculate overtime hours (for durations exceeding 8 hours)
        delta = now - attendance.clock_in
        hours_worked = Decimal(delta.total_seconds() / 3600.0)
        if hours_worked > 8:
            attendance.overtime_hours = round(hours_worked - Decimal(8.0), 2)
        else:
            attendance.overtime_hours = Decimal(0.0)

        attendance.save()
        return Response(AttendanceSerializer(attendance).data)
