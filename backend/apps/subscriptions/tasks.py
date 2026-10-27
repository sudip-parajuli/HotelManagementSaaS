"""
SIA HMS — SaaS Subscriptions Background Tasks
Defines billing cycles, warnings, and suspension check triggers.
"""

import logging
from django.utils import timezone
from datetime import timedelta
from celery import shared_task
from apps.subscriptions.models import (
    TenantSubscription, SubscriptionInvoice, SubscriptionStatus, InvoiceStatus,
    TenantModuleSubscription, TenantModuleSubscriptionStatus, ModuleInvoice,
)
from apps.subscriptions.billing_service import generate_monthly_invoice
from apps.notifications.sms import send_sms

logger = logging.getLogger(__name__)


@shared_task
def check_expiring_subscriptions():
    """
    Scans subscriptions ending in exactly 3 days.
    Sends renewal warnings via Sparrow SMS.
    """
    today = timezone.localdate()
    warning_date = today + timedelta(days=3)
    
    subs = TenantSubscription.objects.filter(
        status__in=[SubscriptionStatus.ACTIVE, SubscriptionStatus.TRIAL],
        next_billing_date=warning_date
    )
    
    for sub in subs:
        msg = f"SIA HMS Warning: Your subscription for {sub.tenant.name} ends in 3 days on {sub.next_billing_date}. Please renew to prevent suspension."
        if sub.tenant.contact_phone:
            send_sms(sub.tenant.contact_phone, msg)
            logger.info(f"Sent expiration warning to {sub.tenant.name} on {sub.tenant.contact_phone}")


@shared_task
def suspend_delinquent_tenants():
    """
    Scans past_due subscriptions: if past_due > 7 days, suspends tenant schema.
    """
    today = timezone.localdate()
    cutoff_date = today - timedelta(days=7)
    
    subs = TenantSubscription.objects.filter(
        status=SubscriptionStatus.PAST_DUE,
        next_billing_date__lte=cutoff_date
    )
    
    for sub in subs:
        sub.status = SubscriptionStatus.SUSPENDED
        sub.save()
        
        msg = f"SIA HMS Alert: Your subscription for {sub.tenant.name} has been SUSPENDED due to non-payment. Access is now restricted."
        if sub.tenant.contact_phone:
            send_sms(sub.tenant.contact_phone, msg)
            logger.info(f"Suspended tenant {sub.tenant.name}")


@shared_task
def generate_monthly_subscription_invoices():
    """
    LEGACY — kept for backward compatibility.
    Compiles monthly invoices for all active/trial subscriptions.
    """
    today = timezone.localdate()
    
    subs = TenantSubscription.objects.filter(
        status__in=[SubscriptionStatus.ACTIVE, SubscriptionStatus.TRIAL, SubscriptionStatus.PAST_DUE],
        next_billing_date=today
    )
    
    for sub in subs:
        invoice = SubscriptionInvoice.objects.create(
            tenant=sub.tenant,
            plan=sub.plan,
            amount=sub.plan.price_monthly,
            period_start=today,
            period_end=today + timedelta(days=30),
            status=InvoiceStatus.PENDING
        )
        
        sub.current_period_start = today
        sub.current_period_end = today + timedelta(days=30)
        sub.next_billing_date = today + timedelta(days=30)
        sub.status = SubscriptionStatus.PAST_DUE
        sub.save()
        
        msg = f"SIA HMS Invoice: Subscription bill generated for {sub.tenant.name} for Rs.{invoice.amount}. Pay by {sub.next_billing_date}."
        if sub.tenant.contact_phone:
            send_sms(sub.tenant.contact_phone, msg)
            logger.info(f"Generated invoice #{invoice.id} for {sub.tenant.name}")


# ─── NEW: Modular Invoice Generation ──────────────────────────────────────────

@shared_task
def generate_module_based_invoices():
    """
    Celery Beat task: generates monthly ModuleInvoices for all active tenants
    who have at least one active TenantModuleSubscription.
    Runs on the 1st of each month at 6 AM.
    """
    from apps.tenants.models import Client
    
    today = timezone.localdate()
    tenant_ids = (
        TenantModuleSubscription.objects
        .filter(status=TenantModuleSubscriptionStatus.ACTIVE)
        .values_list("tenant_id", flat=True)
        .distinct()
    )
    
    generated = 0
    for tenant_id in tenant_ids:
        try:
            invoice = generate_monthly_invoice(tenant_id)
            tenant = Client.objects.get(id=tenant_id)
            msg = (
                f"SIA HMS Invoice: Module-based bill generated for {tenant.name} "
                f"for Rs.{invoice.total}. {invoice.line_items.count()} modules."
            )
            if tenant.contact_phone:
                send_sms(tenant.contact_phone, msg)
            generated += 1
            logger.info(f"Generated module invoice #{invoice.id} for {tenant.name}")
        except Exception as e:
            logger.error(f"Failed to generate module invoice for tenant {tenant_id}: {e}")
    
    logger.info(f"Generated {generated} module-based invoices.")
    return generated
