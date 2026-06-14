"""
SIA HMS — Subscriptions API Views
"""

from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from django.utils import timezone

from apps.accounts.permissions import IsSuperAdmin
from apps.subscriptions.models import SubscriptionPlan, TenantSubscription, SubscriptionInvoice, SubscriptionStatus, InvoiceStatus
from apps.subscriptions.serializers import (
    SubscriptionPlanSerializer,
    TenantSubscriptionSerializer,
    SubscriptionInvoiceSerializer
)

class SubscriptionPlanViewSet(viewsets.ModelViewSet):
    """CRUD ViewSet for Subscription Pricing Plans (Public Schema)"""
    permission_classes = [IsAuthenticated, IsSuperAdmin]
    queryset = SubscriptionPlan.objects.all().order_by('price_monthly')
    serializer_class = SubscriptionPlanSerializer


class TenantSubscriptionViewSet(viewsets.ModelViewSet):
    """CRUD ViewSet for Tenant active subscriptions (Public Schema)"""
    permission_classes = [IsAuthenticated, IsSuperAdmin]
    queryset = TenantSubscription.objects.all().order_by('-created_at')
    serializer_class = TenantSubscriptionSerializer

    @action(detail=True, methods=["post"])
    def cancel_subscription(self, request, pk=None):
        sub = self.get_object()
        sub.status = SubscriptionStatus.CANCELLED
        sub.cancelled_at = timezone.localdate()
        sub.save()
        return Response({"message": f"Subscription for {sub.tenant.name} cancelled."})


class SubscriptionInvoiceViewSet(viewsets.ReadOnlyModelViewSet):
    """View / manage subscription invoices (Public Schema)"""
    permission_classes = [IsAuthenticated, IsSuperAdmin]
    queryset = SubscriptionInvoice.objects.all().order_by('-created_at')
    serializer_class = SubscriptionInvoiceSerializer

    @action(detail=True, methods=["post"])
    def mark_paid(self, request, pk=None):
        invoice = self.get_object()
        if invoice.status == InvoiceStatus.PAID:
            return Response({"error": "Invoice is already paid."}, status=status.HTTP_400_BAD_REQUEST)

        payment_ref = request.data.get("payment_ref", "manual-admin-pay")
        
        invoice.status = InvoiceStatus.PAID
        invoice.paid_at = timezone.now()
        invoice.payment_ref = payment_ref
        invoice.save()

        # Re-activate tenant subscription status if it was suspended or past_due
        sub = TenantSubscription.objects.filter(tenant=invoice.tenant).first()
        if sub and sub.status in [SubscriptionStatus.PAST_DUE, SubscriptionStatus.SUSPENDED]:
            sub.status = SubscriptionStatus.ACTIVE
            sub.save()

        return Response({
            "message": "Invoice marked as paid.",
            "invoice_id": invoice.id,
            "status": invoice.status,
            "paid_at": invoice.paid_at
        })
