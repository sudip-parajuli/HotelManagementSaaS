"""
SIA HMS — Data migration: convert existing plan-based feature subscriptions
to per-module TenantModuleSubscription records.

Reads each tenant's TenantSubscription.plan.features[] and creates a
TenantModuleSubscription for each matching AddonModule.

Safe to run on tenant schemas (tables only exist in public schema for shared app).
"""

from django.db import migrations, ProgrammingError


def migrate_plan_to_modules(apps, schema_editor):
    connection = schema_editor.connection
    # Shared app tables (subscriptions) only exist in public schema
    from django_tenants.utils import get_public_schema_name
    if connection.schema_name != get_public_schema_name():
        return

    TenantSubscription = apps.get_model("subscriptions", "TenantSubscription")
    TenantModuleSubscription = apps.get_model("subscriptions", "TenantModuleSubscription")
    AddonModule = apps.get_model("subscriptions", "AddonModule")

    try:
        for sub in TenantSubscription.objects.select_related("plan", "tenant").iterator():
            if not sub.plan or not sub.plan.features:
                continue

            feature_keys = sub.plan.features
            modules = AddonModule.objects.filter(key__in=feature_keys)

            for module in modules:
                status = "active" if sub.status in ("active", "trial") else "cancelled"
                TenantModuleSubscription.objects.update_or_create(
                    tenant=sub.tenant,
                    module=module,
                    defaults={
                        "status": status,
                        "billing_cycle": "monthly",
                        "price_at_activation": module.price_monthly or 0,
                        "next_billing_date": sub.next_billing_date,
                        "cancelled_at": sub.cancelled_at if sub.status == "cancelled" else None,
                    },
                )
    except ProgrammingError:
        # Table doesn't exist in this schema — skip
        pass


class Migration(migrations.Migration):

    dependencies = [
        ("subscriptions", "0003_remove_addonmodule_price_one_time_and_more"),
    ]

    operations = [
        migrations.RunPython(migrate_plan_to_modules, migrations.RunPython.noop),
    ]
