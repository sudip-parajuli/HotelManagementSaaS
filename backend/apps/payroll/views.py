"""
SIA HMS — Payroll App Views
Defines PayrollPeriodViewSet and PayrollEntryViewSet.
"""

from decimal import Decimal
from django.db import transaction
from django.utils import timezone
from django_filters.rest_framework import DjangoFilterBackend
from rest_framework import viewsets, status, filters
from rest_framework.decorators import action
from rest_framework.response import Response
from apps.accounts.permissions import IsPropertyManager, IsAnyStaff
from apps.staff.models import StaffMember
from .models import PayrollPeriod, PayrollEntry, PayrollPeriodStatus
from .serializers import PayrollPeriodSerializer, PayrollEntrySerializer
from .calculator import calculate_payroll_entry_data


class PayrollPeriodViewSet(viewsets.ModelViewSet):
    """
    CRUD for Payroll Periods.
    """
    queryset = PayrollPeriod.objects.all()
    serializer_class = PayrollPeriodSerializer
    filter_backends = [DjangoFilterBackend]
    filterset_fields = ["status"]

    def get_permissions(self):
        return [IsPropertyManager()]

    @action(detail=True, methods=["post"])
    def calculate(self, request, pk=None):
        period = self.get_object()
        if period.status in [PayrollPeriodStatus.APPROVED, PayrollPeriodStatus.PAID]:
            return Response(
                {"error": "Period is already approved or paid."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        active_staff = StaffMember.objects.filter(is_active=True).select_related("user", "department")
        
        with transaction.atomic():
            period.status = PayrollPeriodStatus.PROCESSING
            period.save()
            
            # Clear old entries for this period
            PayrollEntry.objects.filter(period=period).delete()
            
            entries_to_create = []
            for staff in active_staff:
                data = calculate_payroll_entry_data(staff, period.month, period.year)
                entries_to_create.append(
                    PayrollEntry(
                        period=period,
                        staff=staff,
                        **data
                    )
                )
            
            PayrollEntry.objects.bulk_create(entries_to_create)
            
            period.status = PayrollPeriodStatus.DRAFT
            period.save()
            
        return Response(
            {"message": f"Successfully calculated payroll for {len(entries_to_create)} staff members."},
            status=status.HTTP_200_OK,
        )

    @action(detail=True, methods=["post"])
    def approve(self, request, pk=None):
        period = self.get_object()
        if period.status != PayrollPeriodStatus.DRAFT:
            return Response(
                {"error": "Only periods in Draft status can be approved."},
                status=status.HTTP_400_BAD_REQUEST,
            )
            
        with transaction.atomic():
            period.status = PayrollPeriodStatus.APPROVED
            period.save()
            period.entries.update(is_approved=True, approved_by=request.user)
            
        return Response({"message": "Payroll period approved successfully."}, status=status.HTTP_200_OK)

    @action(detail=True, methods=["post"])
    def pay(self, request, pk=None):
        period = self.get_object()
        if period.status != PayrollPeriodStatus.APPROVED:
            return Response(
                {"error": "Only approved periods can be marked as Paid."},
                status=status.HTTP_400_BAD_REQUEST,
            )
            
        period.status = PayrollPeriodStatus.PAID
        period.save()
        return Response({"message": "Payroll period marked as Paid successfully."}, status=status.HTTP_200_OK)


class PayrollEntryViewSet(viewsets.ModelViewSet):
    """
    CRUD for Payroll Entries.
    """
    queryset = PayrollEntry.objects.select_related("period", "staff__user", "staff__department").all()
    serializer_class = PayrollEntrySerializer
    filter_backends = [DjangoFilterBackend]
    filterset_fields = ["period", "staff", "is_approved"]

    def get_permissions(self):
        if self.action in ["list", "retrieve", "payslip"]:
            return [IsAnyStaff()]
        return [IsPropertyManager()]

    @action(detail=True, methods=["get"])
    def payslip(self, request, pk=None):
        entry = self.get_object()
        
        # Simple read verification (employees can view their own payslip; managers can view any)
        if request.user.role not in ["SUPER_ADMIN", "PROPERTY_MANAGER", "ACCOUNTANT"]:
            if entry.staff.user != request.user:
                return Response(
                    {"error": "You do not have permission to view this payslip."},
                    status=status.HTTP_403_FORBIDDEN,
                )
        
        # Generate QR verification data containing verification details
        qr_data = f"SIA-HMS-PAYSLIP:{entry.staff.user.email}:{entry.period.month}/{entry.period.year}:{entry.net_salary}"
        qr_code_url = f"https://api.qrserver.com/v1/create-qr-code/?size=150x150&data={qr_data}"
        
        # Render HTML template to string
        from django.template.loader import render_to_string
        
        # Convert allowances & deductions values safely to float
        allowance_sum = sum(float(item.get("amount", 0)) for item in entry.allowances)
        deduction_sum = sum(float(item.get("amount", 0)) for item in entry.deductions)
        
        lang = request.query_params.get("lang") or (request.user.preferred_language if hasattr(request.user, "preferred_language") else "en")
        context = {
            "entry": entry,
            "qr_code_url": qr_code_url,
            "allowances_total": allowance_sum,
            "deductions_total": deduction_sum,
            "company_name": "SIA HMS Hotels",
            "lang": lang,
        }
        
        html_string = render_to_string("pdf/payslip.html", context)
        
        from django.http import HttpResponse
        
        try:
            from weasyprint import HTML
            html = HTML(string=html_string, base_url=request.build_absolute_uri("/"))
            pdf = html.write_pdf()
            response = HttpResponse(pdf, content_type="application/pdf")
            response["Content-Disposition"] = f'inline; filename="payslip_{entry.staff.user.username}_{entry.period.month}_{entry.period.year}.pdf"'
            return response
        except Exception as e:
            # Fallback plain HTML rendering in case WeasyPrint fails or is missing libraries locally
            import logging
            logger = logging.getLogger(__name__)
            logger.error(f"WeasyPrint PDF generation failed: {e}")
            response = HttpResponse(html_string, content_type="text/html")
            return response
