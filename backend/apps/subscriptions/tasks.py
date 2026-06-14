"""
SIA HMS — SaaS Subscriptions Background Tasks
Defines billing cycles, warnings, and suspension check triggers.
"""

import logging
from django.utils import timezone
from datetime import timedelta
from celery import shared_task
from apps.subscriptions.models import TenantSubscription, SubscriptionInvoice, SubscriptionStatus, InvoiceStatus
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
    Compiles monthly invoices for all active/trial subscriptions whose next billing date is today.
    Updates next billing date and marks subscription past_due.
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
