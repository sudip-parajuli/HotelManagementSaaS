"""
SIA HMS — Billing App Views
Defines InvoiceViewSet, InvoiceItemViewSet, and PaymentViewSet.
"""

from decimal import Decimal
from django.db import transaction
from django.utils import timezone
from django_filters.rest_framework import DjangoFilterBackend
from rest_framework import viewsets, status, filters
from rest_framework.decorators import action
from rest_framework.response import Response
from apps.accounts.permissions import IsPropertyManager, IsAnyStaff
from .models import Invoice, InvoiceItem, Payment, InvoiceStatus, PaymentMethod, InvoiceItemType
from .serializers import InvoiceSerializer, InvoiceItemSerializer, PaymentSerializer


class InvoiceViewSet(viewsets.ModelViewSet):
    """
    CRUD for Invoices.
    """
    queryset = Invoice.objects.select_related("reservation__guest", "reservation__room").prefetch_related("items", "payments").all()
    serializer_class = InvoiceSerializer
    filter_backends = [DjangoFilterBackend, filters.SearchFilter, filters.OrderingFilter]
    filterset_fields = ["status", "invoice_type", "reservation"]
    search_fields = ["invoice_number", "walk_in_guest_name", "walk_in_guest_phone"]
    ordering_fields = ["created_at", "total_amount", "paid_amount"]

    def get_permissions(self):
        if self.action in ["list", "retrieve", "pdf"]:
            return [IsAnyStaff()]
        return [IsPropertyManager()]

    @action(detail=True, methods=["post"])
    def payments(self, request, pk=None):
        """
        Record a payment transaction settling a portion or all of the invoice.
        """
        invoice = self.get_object()
        amount = request.data.get("amount")
        payment_method = request.data.get("payment_method", PaymentMethod.CASH)
        reference_number = request.data.get("reference_number", "")
        notes = request.data.get("notes", "")

        if not amount:
            return Response({"error": "amount is required."}, status=status.HTTP_400_BAD_REQUEST)

        with transaction.atomic():
            payment = Payment.objects.create(
                invoice=invoice,
                amount=Decimal(str(amount)),
                payment_method=payment_method,
                reference_number=reference_number,
                received_by=request.user,
                notes=notes,
            )

            invoice.paid_amount += Decimal(str(amount))
            invoice.save()  # recalculated balances inside model save()

            if invoice.balance_due <= 0:
                invoice.status = InvoiceStatus.PAID
            elif invoice.paid_amount > 0:
                invoice.status = InvoiceStatus.PARTIALLY_PAID
            invoice.save()

        return Response(PaymentSerializer(payment).data, status=status.HTTP_201_CREATED)

    @action(detail=True, methods=["post"])
    def void(self, request, pk=None):
        """
        Voids the current invoice.
        """
        invoice = self.get_object()
        if invoice.status == InvoiceStatus.PAID:
            return Response({"error": "Cannot void a fully paid invoice."}, status=status.HTTP_400_BAD_REQUEST)

        invoice.status = InvoiceStatus.VOIDED
        invoice.save()
        return Response(InvoiceSerializer(invoice).data, status=status.HTTP_200_OK)

    @action(detail=True, methods=["get"])
    def pdf(self, request, pk=None):
        """
        Generates and streams a print-ready IRD VAT Invoice.
        """
        invoice = self.get_object()
        
        # Prepare context for the printable HTML invoice
        from django.template.loader import render_to_string
        
        lang = request.query_params.get("lang") or (request.user.preferred_language if hasattr(request.user, "preferred_language") else "en")
        context = {
            "invoice": invoice,
            "company_name": "SIA HMS Resorts",
            "company_pan": "601234567",  # Demo PAN Number
            "company_address": "Lakeside, Pokhara, Nepal",
            "company_phone": "+977-61-460000",
            "fiscal_year": invoice.fiscal_year,
            "lang": lang,
        }
        
        html_string = render_to_string("pdf/invoice.html", context)
        
        from django.http import HttpResponse
        
        try:
            from weasyprint import HTML
            html = HTML(string=html_string, base_url=request.build_absolute_uri("/"))
            pdf = html.write_pdf()
            response = HttpResponse(pdf, content_type="application/pdf")
            response["Content-Disposition"] = f'inline; filename="invoice_{invoice.invoice_number}.pdf"'
            return response
        except Exception as e:
            import logging
            logger = logging.getLogger(__name__)
            logger.error(f"WeasyPrint PDF invoice generation failed: {e}")
            response = HttpResponse(html_string, content_type="text/html")
            return response

    @action(detail=False, methods=["get"])
    def daily_summary(self, request):
        """
        Returns dynamic summary statistics of payments and invoices settled today.
        """
        today = timezone.localdate()
        date_str = request.query_params.get("date", str(today))
        
        payments = Payment.objects.filter(created_at__date=date_str)
        invoices = Invoice.objects.filter(created_at__date=date_str)
        
        total_payments = sum(p.amount for p in payments)
        payment_by_method = {}
        for p in payments:
            payment_by_method[p.payment_method] = payment_by_method.get(p.payment_method, Decimal(0)) + p.amount
            
        total_invoiced = sum(i.total_amount for i in invoices)
        
        return Response({
            "date": date_str,
            "total_payments_collected": str(total_payments),
            "payment_by_method": {k: str(v) for k, v in payment_by_method.items()},
            "total_invoiced_today": str(total_invoiced),
            "invoice_count": invoices.count(),
        }, status=status.HTTP_200_OK)


class InvoiceItemViewSet(viewsets.ModelViewSet):
    """
    CRUD for Invoice items. Modifying items automatically recalculates parent Invoice totals.
    """
    queryset = InvoiceItem.objects.all()
    serializer_class = InvoiceItemSerializer
    permission_classes = [IsPropertyManager]

    @transaction.atomic
    def perform_create(self, serializer):
        item = serializer.save()
        self._recalculate_invoice(item.invoice)

    @transaction.atomic
    def perform_update(self, serializer):
        item = serializer.save()
        self._recalculate_invoice(item.invoice)

    @transaction.atomic
    def perform_destroy(self, instance):
        invoice = instance.invoice
        instance.delete()
        self._recalculate_invoice(invoice)

    def _recalculate_invoice(self, invoice):
        from apps.properties.models import Property
        prop = Property.objects.first()
        
        # Determine rates
        if prop:
            service_charge_applicable = prop.service_charge_applicable
            sc_rate = prop.service_charge_rate if service_charge_applicable else Decimal("0.00")
            vat_rate = prop.vat_rate
            rebate_rate = prop.digital_payment_rebate_rate
        else:
            sc_rate = Decimal("10.00")
            vat_rate = Decimal("13.00")
            rebate_rate = Decimal("10.00")
            
        invoice.service_charge_rate = sc_rate
        invoice.tax_rate = vat_rate
        
        # Sum items total
        items = invoice.items.all()
        subtotal = sum(i.amount for i in items if i.item_type != InvoiceItemType.DISCOUNT)
        discount_items = sum(i.amount for i in items if i.item_type == InvoiceItemType.DISCOUNT)
        
        # Base Price (subtotal of normal items minus discount items)
        base_price = subtotal - abs(discount_items)
        if base_price < Decimal("0.00"):
            base_price = Decimal("0.00")
            
        # 1. Base Price (less discounts)
        invoice.subtotal = base_price
        
        # 2. Service Charge = Base Price * sc_rate
        sc_amount = base_price * (sc_rate / Decimal("100.00"))
        invoice.service_charge_amount = sc_amount
        
        # 3. Subtotal = Base Price + Service Charge
        taxable_amount = base_price + sc_amount
        
        # 4. VAT = Subtotal * vat_rate
        vat_amount = taxable_amount * (vat_rate / Decimal("100.00"))
        invoice.tax_amount = vat_amount
        invoice.vat_amount = vat_amount
        
        # 5. Gross Total = Subtotal + VAT
        gross_total = taxable_amount + vat_amount - invoice.discount_amount
        if gross_total < Decimal("0.00"):
            gross_total = Decimal("0.00")
        invoice.total_amount = gross_total
        
        # Digital payment rebate: rebate_rate% of VAT
        digital_rebate = vat_amount * (rebate_rate / Decimal("100.00"))
        invoice.digital_rebate_amount = digital_rebate
        invoice.net_payable_amount = gross_total - digital_rebate
        
        invoice.save()


class PaymentViewSet(viewsets.ReadOnlyModelViewSet):
    """
    Read-only view for payment transactions audit logs.
    """
    queryset = Payment.objects.select_related("invoice", "received_by").all()
    serializer_class = PaymentSerializer
    filter_backends = [DjangoFilterBackend, filters.OrderingFilter]
    filterset_fields = ["invoice", "payment_method"]
    ordering_fields = ["created_at", "amount"]
    permission_classes = [IsAnyStaff]
