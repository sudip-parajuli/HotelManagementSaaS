"""
SIA HMS — Payment Views
Handles checkout transaction initiations, redirect callbacks, and webhook checks.
"""

from decimal import Decimal
from django.db import transaction
from django.utils import timezone
from django.shortcuts import redirect
from django.conf import settings
from rest_framework import viewsets, status
from rest_framework.decorators import action, api_view, permission_classes
from rest_framework.permissions import IsAuthenticated, AllowAny
from rest_framework.response import Response
from apps.billing.models import Invoice, InvoiceStatus, Payment, PaymentMethod
from .models import PaymentTransaction
from .esewa import generate_esewa_signature, verify_esewa_response, verify_esewa_signature
from .khalti import initiate_khalti_payment, verify_khalti_payment
from .fonepay import initiate_fonepay_qr, verify_fonepay_status


class PaymentGatewayViewSet(viewsets.ViewSet):
    """
    Endpoints for initiating gateway checkouts and polling payment statuses.
    """
    permission_classes = [IsAuthenticated]

    @action(detail=False, methods=["post"])
    def initiate(self, request):
        """
        Creates a pending PaymentTransaction and compiles signature payloads.
        """
        invoice_id = request.data.get("invoice_id")
        gateway = request.data.get("gateway") # esewa | khalti | fonepay
        
        if not invoice_id or not gateway:
            return Response(
                {"error": "invoice_id and gateway are required."},
                status=status.HTTP_400_BAD_REQUEST
            )
            
        try:
            invoice = Invoice.objects.get(pk=invoice_id)
        except Invoice.DoesNotExist:
            return Response({"error": "Invoice not found."}, status=status.HTTP_404_NOT_FOUND)

        if invoice.balance_due <= 0:
            return Response({"error": "Invoice is already fully settled."}, status=status.HTTP_400_BAD_REQUEST)

        amount = invoice.balance_due
        
        # 1. Create pending transaction
        tx = PaymentTransaction.objects.create(
            invoice=invoice,
            gateway=gateway,
            amount=amount,
            status=PaymentTransaction.StatusChoices.PENDING,
        )

        success_url = request.build_absolute_uri(f"/api/payments/verify-{gateway}/")
        
        # 2. Compile eSewa parameters
        if gateway == "esewa":
            # eSewa ePay v2 parameters Form POST
            tx_uuid = f"TX-{tx.id}"
            signature = generate_esewa_signature(str(amount), tx_uuid)
            
            # eSewa requires redirect callback success url
            esewa_success = request.build_absolute_uri(f"/api/payments/verify-esewa/?tx_id={tx.id}")
            esewa_failure = "http://localhost:3000/billing/?status=failed"
            
            form_data = {
                "amount": str(amount),
                "tax_amount": "0",
                "total_amount": str(amount),
                "transaction_uuid": tx_uuid,
                "product_code": settings.ESEWA_MERCHANT_CODE,
                "product_service_charge": "0",
                "product_delivery_charge": "0",
                "success_url": esewa_success,
                "failure_url": esewa_failure,
                "signature": signature,
                "gateway_url": settings.ESEWA_GATEWAY_URL,
            }
            return Response({"transaction_id": tx.id, "esewa_payload": form_data})

        # 3. Compile Khalti parameters
        elif gateway == "khalti":
            khalti_return = request.build_absolute_uri(f"/api/payments/verify-khalti/?tx_id={tx.id}")
            customer_name = invoice.reservation.guest.full_name if invoice.reservation else invoice.walk_in_guest_name
            customer_phone = invoice.reservation.guest.phone if invoice.reservation else invoice.walk_in_guest_phone
            
            khalti_res = initiate_khalti_payment(
                amount_npr=float(amount),
                invoice_number=invoice.invoice_number,
                return_url=khalti_return,
                customer_name=customer_name or "HMS Guest",
                customer_phone=customer_phone,
            )
            
            if khalti_res and "pidx" in khalti_res:
                tx.gateway_ref = khalti_res["pidx"]
                tx.save()
                return Response({
                    "transaction_id": tx.id,
                    "payment_url": khalti_res["payment_url"],
                    "pidx": khalti_res["pidx"]
                })
            else:
                tx.status = PaymentTransaction.StatusChoices.FAILED
                tx.save()
                return Response({"error": "Khalti initiation request failed."}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

        # 4. Compile Fonepay parameters (Sandbox verification helper)
        elif gateway == "fonepay":
            fonepay_return = request.build_absolute_uri(f"/api/payments/verify-fonepay/?tx_id={tx.id}")
            fonepay_res = initiate_fonepay_qr(
                amount_npr=float(amount),
                transaction_id=str(tx.id),
                return_url=fonepay_return,
            )
            if fonepay_res and fonepay_res.get("status") == "success":
                tx.gateway_ref = fonepay_res.get("prn", f"TX-{tx.id}")
                tx.save()
                return Response({
                    "transaction_id": tx.id,
                    "qr_code_placeholder": fonepay_res["qr_code_url"],
                    "message": "Fonepay QR Code generated successfully."
                })
            else:
                tx.status = PaymentTransaction.StatusChoices.FAILED
                tx.save()
                return Response({"error": fonepay_res.get("error", "Fonepay dynamic QR request failed.")}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

        return Response({"error": "Invalid gateway specified."}, status=status.HTTP_400_BAD_REQUEST)

    @action(detail=True, methods=["post"])
    def verify_polling(self, request, pk=None):
        """
        Polls or forces success checks on a transaction (useful for QR testing).
        """
        try:
            tx = PaymentTransaction.objects.get(pk=pk)
        except PaymentTransaction.DoesNotExist:
            return Response({"error": "Transaction not found."}, status=status.HTTP_404_NOT_FOUND)

        if tx.status == PaymentTransaction.StatusChoices.SUCCESS:
            return Response({"status": "success", "invoice_id": tx.invoice.id})

        # Process Fonepay status checks
        if tx.gateway == "fonepay" and tx.status == PaymentTransaction.StatusChoices.PENDING:
            check_res = verify_fonepay_status(str(tx.id), float(tx.amount))
            if check_res.get("status") == "success":
                with transaction.atomic():
                    tx.status = PaymentTransaction.StatusChoices.SUCCESS
                    tx.gateway_ref = check_res.get("transaction_code", f"FP-{tx.id}")
                    tx.save()

                    invoice = tx.invoice
                    invoice.paid_amount += tx.amount
                    invoice.save()

                    if invoice.balance_due <= 0:
                        invoice.status = InvoiceStatus.PAID
                    else:
                        invoice.status = InvoiceStatus.PARTIALLY_PAID
                    invoice.save()

                    # Record Payment logs
                    Payment.objects.create(
                        invoice=invoice,
                        amount=tx.amount,
                        payment_method=tx.gateway,
                        reference_number=tx.gateway_ref,
                        received_by=request.user,
                        notes=f"Settled via Fonepay merchant QR transaction #{tx.id}",
                    )

                return Response({"status": "success", "invoice_id": invoice.id})
            elif check_res.get("status") == "pending":
                return Response({"status": "pending"})
            else:
                tx.status = PaymentTransaction.StatusChoices.FAILED
                tx.save()
                return Response({"status": "failed", "error": check_res.get("message")})

        # Sandbox simulation helper: auto-approve pending Cash/other transactions on verify click
        if tx.status == PaymentTransaction.StatusChoices.PENDING:
            with transaction.atomic():
                tx.status = PaymentTransaction.StatusChoices.SUCCESS
                tx.gateway_ref = f"REF-{timezone.now().timestamp()}"
                tx.save()

                invoice = tx.invoice
                invoice.paid_amount += tx.amount
                invoice.save()

                if invoice.balance_due <= 0:
                    invoice.status = InvoiceStatus.PAID
                else:
                    invoice.status = InvoiceStatus.PARTIALLY_PAID
                invoice.save()

                # Record Payment logs
                Payment.objects.create(
                    invoice=invoice,
                    amount=tx.amount,
                    payment_method=tx.gateway,
                    reference_number=tx.gateway_ref,
                    received_by=request.user,
                    notes=f"Settled via {tx.gateway.upper()} gateway transaction #{tx.id}",
                )

            return Response({"status": "success", "invoice_id": invoice.id})

        return Response({"status": "pending"})


@api_view(["GET"])
@permission_classes([AllowAny])
def verify_esewa_redirect(request):
    """
    Handles eSewa success callback redirect. eSewa passes a base64 encoded "data" parameter.
    """
    encoded_data = request.query_params.get("data")
    tx_id = request.query_params.get("tx_id")
    
    if not encoded_data or not tx_id:
        return redirect("http://localhost:3000/billing/?status=failed")
        
    response_data = verify_esewa_response(encoded_data)
    signature = request.query_params.get("signature") or response_data.get("signature", "")
    
    # Verify transaction signature
    if not verify_esewa_signature(response_data, signature):
        return redirect("http://localhost:3000/billing/?status=failed&reason=signature_mismatch")
        
    status_code = response_data.get("status")
    
    if status_code == "COMPLETE":
        try:
            with transaction.atomic():
                tx = PaymentTransaction.objects.select_for_update().get(pk=tx_id)
                if tx.status == PaymentTransaction.StatusChoices.PENDING:
                    tx.status = PaymentTransaction.StatusChoices.SUCCESS
                    tx.gateway_ref = response_data.get("transaction_code", f"ESEWA-{tx.id}")
                    tx.raw_response = response_data
                    tx.save()
                    
                    invoice = tx.invoice
                    invoice.paid_amount += tx.amount
                    invoice.save()
                    
                    if invoice.balance_due <= 0:
                        invoice.status = InvoiceStatus.PAID
                    else:
                        invoice.status = InvoiceStatus.PARTIALLY_PAID
                    invoice.save()
                    
                    # Record payment log (using system admin/received user if none authenticated)
                    from django.contrib.auth import get_user_model
                    User = get_user_model()
                    system_user = User.objects.filter(role="SUPER_ADMIN").first() or User.objects.first()
                    
                    Payment.objects.create(
                        invoice=invoice,
                        amount=tx.amount,
                        payment_method=PaymentMethod.ESEWA,
                        reference_number=tx.gateway_ref,
                        received_by=system_user,
                        notes=f"Auto-settled via eSewa checkout redirect.",
                    )
                    
            return redirect(f"http://localhost:3000/billing/?status=success&invoice_id={tx.invoice.id}")
        except Exception:
            return redirect("http://localhost:3000/billing/?status=failed&reason=transaction_update_failed")
            
    return redirect("http://localhost:3000/billing/?status=failed")


@api_view(["GET"])
@permission_classes([AllowAny])
def verify_khalti_redirect(request):
    """
    Handles Khalti success callback redirect containing pidx parameters.
    """
    tx_id = request.query_params.get("tx_id")
    pidx = request.query_params.get("pidx")
    status_str = request.query_params.get("status")
    
    if not tx_id or not pidx:
        return redirect("http://localhost:3000/billing/?status=failed")
        
    if status_str != "Completed":
        return redirect("http://localhost:3000/billing/?status=failed")
        
    # Perform API lookup verification to prevent spoofing
    verification = verify_khalti_payment(pidx)
    
    if verification.get("status") == "Completed":
        try:
            with transaction.atomic():
                tx = PaymentTransaction.objects.select_for_update().get(pk=tx_id)
                if tx.status == PaymentTransaction.StatusChoices.PENDING:
                    tx.status = PaymentTransaction.StatusChoices.SUCCESS
                    tx.gateway_ref = pidx
                    tx.raw_response = verification
                    tx.save()
                    
                    invoice = tx.invoice
                    invoice.paid_amount += tx.amount
                    invoice.save()
                    
                    if invoice.balance_due <= 0:
                        invoice.status = InvoiceStatus.PAID
                    else:
                        invoice.status = InvoiceStatus.PARTIALLY_PAID
                    invoice.save()
                    
                    from django.contrib.auth import get_user_model
                    User = get_user_model()
                    system_user = User.objects.filter(role="SUPER_ADMIN").first() or User.objects.first()
                    
                    Payment.objects.create(
                        invoice=invoice,
                        amount=tx.amount,
                        payment_method=PaymentMethod.KHALTI,
                        reference_number=pidx,
                        received_by=system_user,
                        notes=f"Auto-settled via Khalti wallet lookup verification.",
                    )
            return redirect(f"http://localhost:3000/billing/?status=success&invoice_id={tx.invoice.id}")
        except Exception:
            return redirect("http://localhost:3000/billing/?status=failed&reason=transaction_update_failed")
            
    return redirect("http://localhost:3000/billing/?status=failed")
