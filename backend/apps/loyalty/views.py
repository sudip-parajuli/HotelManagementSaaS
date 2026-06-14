"""
SIA HMS — Loyalty App Views
Defines LoyaltyAccountViewSet and LoyaltyTransactionViewSet.
"""

from decimal import Decimal
from django.db import transaction
from django_filters.rest_framework import DjangoFilterBackend
from rest_framework import viewsets, status, filters
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated

from apps.accounts.permissions import IsPropertyManager, IsAnyStaff
from apps.billing.models import Invoice, InvoiceItem, InvoiceItemType, InvoiceStatus
from apps.crm.models import GuestActivity
from .models import LoyaltyAccount, LoyaltyTransaction
from .serializers import LoyaltyAccountSerializer, LoyaltyTransactionSerializer


class LoyaltyAccountViewSet(viewsets.ModelViewSet):
    """
    CRUD for Guest Loyalty accounts.
    """
    queryset = LoyaltyAccount.objects.select_related("guest").prefetch_related("transactions").all()
    serializer_class = LoyaltyAccountSerializer

    def get_permissions(self):
        if self.action in ["list", "retrieve"]:
            return [IsAnyStaff()]
        return [IsPropertyManager()]

    @action(detail=True, methods=["post"])
    def redeem(self, request, pk=None):
        """
        Redeems loyalty points for a guest and applies it as a discount on an invoice.
        """
        account = self.get_object()
        invoice_id = request.data.get("invoice_id")
        points_to_redeem = request.data.get("points")

        if not invoice_id or points_to_redeem is None:
            return Response(
                {"error": "invoice_id and points are required parameters."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        try:
            points_to_redeem = int(points_to_redeem)
            if points_to_redeem <= 0:
                raise ValueError()
        except ValueError:
            return Response(
                {"error": "points must be a positive integer."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        if account.points_balance < points_to_redeem:
            return Response(
                {"error": f"Insufficient points. Balance is {account.points_balance}."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        try:
            invoice = Invoice.objects.get(pk=invoice_id)
        except Invoice.DoesNotExist:
            return Response({"error": "Invoice not found."}, status=status.HTTP_404_NOT_FOUND)

        if invoice.status in [InvoiceStatus.PAID, InvoiceStatus.VOIDED]:
            return Response(
                {"error": "Cannot redeem points on a paid or voided invoice."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        # 100 points = NPR 50
        discount_value = Decimal(points_to_redeem) * Decimal("0.50")

        # Cap redemption if it exceeds remaining balance due
        if discount_value > invoice.balance_due:
            discount_value = invoice.balance_due
            points_to_redeem = int(discount_value / Decimal("0.50"))
            discount_value = Decimal(points_to_redeem) * Decimal("0.50")

        if points_to_redeem <= 0:
            return Response(
                {"error": "Invoice is already fully settled or too small for point redemption."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        with transaction.atomic():
            # 1. Deduct points from LoyaltyAccount
            account.points_balance -= points_to_redeem
            account.save()

            # 2. Create LoyaltyTransaction record
            LoyaltyTransaction.objects.create(
                account=account,
                points=-points_to_redeem,
                transaction_type=LoyaltyTransaction.TransactionType.REDEEM,
                description=f"Redeemed points for invoice {invoice.invoice_number}",
            )

            # 3. Add a discount line item in the Invoice
            InvoiceItem.objects.create(
                invoice=invoice,
                description=f"Loyalty Points Redemption (-{points_to_redeem} pts)",
                quantity=Decimal("1.00"),
                unit_price=-discount_value,
                amount=-discount_value,
                item_type=InvoiceItemType.DISCOUNT,
            )

            # 4. Recalculate Invoice totals
            subtotal = sum(item.amount for item in invoice.items.all())
            sc = subtotal * (invoice.service_charge_rate / Decimal("100.00"))
            taxable_amount = subtotal + sc
            vat = taxable_amount * (invoice.tax_rate / Decimal("100.00"))
            total = taxable_amount + vat - invoice.discount_amount
            
            invoice.subtotal = subtotal
            invoice.service_charge_amount = sc
            invoice.tax_amount = vat
            invoice.total_amount = total
            invoice.balance_due = total - invoice.paid_amount
            invoice.save()
            invoice.refresh_from_db()

            # 5. Log CRM GuestActivity
            GuestActivity.objects.create(
                guest=account.guest,
                activity_type="loyalty_redeem",
                description=f"Redeemed {points_to_redeem} points for NPR {discount_value} discount on invoice {invoice.invoice_number}",
            )

        return Response(
            {
                "message": f"Successfully redeemed {points_to_redeem} points for NPR {discount_value} discount.",
                "points_balance": account.points_balance,
                "invoice_total": str(invoice.total_amount),
                "invoice_balance_due": str(invoice.balance_due),
            },
            status=status.HTTP_200_OK,
        )


class LoyaltyTransactionViewSet(viewsets.ReadOnlyModelViewSet):
    """
    Read-only view for Loyalty Transactions points audit log.
    """
    queryset = LoyaltyTransaction.objects.select_related("account__guest").all()
    serializer_class = LoyaltyTransactionSerializer
    permission_classes = [IsAnyStaff]
    filter_backends = [DjangoFilterBackend, filters.OrderingFilter]
    filterset_fields = ["account", "transaction_type"]
    ordering_fields = ["created_at"]
