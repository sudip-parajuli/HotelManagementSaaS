"""
SIA HMS — Modular Billing Service
Calculates tenant monthly bills from active module subscriptions
and generates per-module line item invoices.
"""

from decimal import Decimal
from datetime import timedelta
from django.utils import timezone
from django.db import transaction

from apps.subscriptions.models import (
    AddonModule,
    TenantModuleSubscription,
    TenantModuleSubscriptionStatus,
    ModuleBillingCycle,
    ModuleInvoice,
    ModuleInvoiceLineItem,
    ModuleInvoiceStatus,
)
from apps.tenants.models import Client


def calculate_tenant_monthly_bill(tenant_id):
    """
    Calculate the current monthly bill for a tenant based on all
    active TenantModuleSubscription records.

    Returns: {
        "modules": [
            {
                "module_key": "billing",
                "module_name": "Billing & Invoicing",
                "billing_cycle": "monthly",
                "price": Decimal("500.00")
            },
            ...
        ],
        "subtotal": Decimal,
        "any_discounts": Decimal,
        "total": Decimal
    }
    """
    subscriptions = TenantModuleSubscription.objects.filter(
        tenant_id=tenant_id,
        status=TenantModuleSubscriptionStatus.ACTIVE
    ).select_related("module")

    modules = []
    subtotal = Decimal("0.00")

    for sub in subscriptions:
        price = sub.price_at_activation
        cycle = sub.billing_cycle

        # Normalise to monthly amount for display
        if cycle == ModuleBillingCycle.YEARLY:
            monthly_price = price / Decimal("12")
        else:
            monthly_price = price

        modules.append({
            "module_key": sub.module.key,
            "module_name": sub.module.name,
            "billing_cycle": cycle,
            "price": monthly_price,
        })
        subtotal += monthly_price

    discounts = Decimal("0.00")
    total = subtotal - discounts

    return {
        "modules": modules,
        "subtotal": subtotal,
        "any_discounts": discounts,
        "total": total,
    }


def generate_monthly_invoice(tenant_id):
    """
    Generate a ModuleInvoice for a tenant based on their active module subscriptions.

    Returns the created ModuleInvoice instance.
    """
    bill = calculate_tenant_monthly_bill(tenant_id)
    today = timezone.localdate()
    period_start = today
    period_end = today + timedelta(days=30)

    with transaction.atomic():
        invoice = ModuleInvoice.objects.create(
            tenant_id=tenant_id,
            subtotal=bill["subtotal"],
            discounts=bill["any_discounts"],
            total=bill["total"],
            period_start=period_start,
            period_end=period_end,
            status=ModuleInvoiceStatus.PENDING,
        )

        for mod in bill["modules"]:
            ModuleInvoiceLineItem.objects.create(
                invoice=invoice,
                module_id=AddonModule.objects.filter(key=mod["module_key"]).values_list("id", flat=True).first(),
                module_name=mod["module_name"],
                billing_cycle=mod["billing_cycle"],
                amount=mod["price"],
            )

        # Update next billing dates for all active subscriptions
        TenantModuleSubscription.objects.filter(
            tenant_id=tenant_id,
            status=TenantModuleSubscriptionStatus.ACTIVE
        ).update(next_billing_date=period_end)

    return invoice
