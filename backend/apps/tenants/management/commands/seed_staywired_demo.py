"""Create a clearly labelled cloud sample property for owner-driven exploration."""
import os
from decimal import Decimal
from datetime import timedelta
from django.core.management import BaseCommand, CommandError
from django.utils import timezone
from django_tenants.utils import schema_context, tenant_context


class Command(BaseCommand):
    help = "Create the isolated staywired_demo tenant and sample rooms; never overwrite real hotel data."

    def handle(self, *args, **options):
        from apps.tenants.models import Client, BusinessType
        from apps.subscriptions.models import AddonModule, TenantModuleSubscription, TenantModuleSubscriptionStatus, TenantSubscription, SubscriptionPlan, SubscriptionStatus
        from apps.properties.models import Property, RoomType, Room, RoomStatus
        email = os.environ.get("STAYWIRED_ADMIN_EMAIL", "")
        if not email:
            raise CommandError("Set STAYWIRED_ADMIN_EMAIL first.")
        marker = "[Staywired demo] Fictional property; no real guests or external billing."
        with schema_context("public"):
            existing = Client.objects.filter(schema_name="staywired_demo").first()
            if existing and existing.notes != marker:
                raise CommandError("The demo schema belongs to a different record; refusing to modify it.")
            tenant, _ = Client.objects.get_or_create(schema_name="staywired_demo", defaults={"name": "Himalayan Haven (Demo)", "contact_email": email, "business_type": BusinessType.objects.get(key="hotel"), "notes": marker, "onboarded_at": timezone.now()})
            today = timezone.localdate()
            TenantSubscription.objects.get_or_create(tenant=tenant, defaults={"plan": SubscriptionPlan.objects.get(slug="trial"), "status": SubscriptionStatus.ACTIVE, "current_period_start": today, "current_period_end": today + timedelta(days=30), "next_billing_date": today + timedelta(days=30)})
            for module in AddonModule.objects.filter(is_active=True):
                TenantModuleSubscription.objects.get_or_create(tenant=tenant, module=module, defaults={"status": TenantModuleSubscriptionStatus.ACTIVE, "price_at_activation": Decimal("0.00"), "next_billing_date": None})
        with tenant_context(tenant):
            prop, _ = Property.objects.get_or_create(name="Himalayan Haven (Demo)", defaults={"address": "Fictional sample property, Lakeside", "city": "Pokhara", "phone": "0000000000", "email": email})
            king, _ = RoomType.objects.get_or_create(property=prop, name="Deluxe King", defaults={"base_price_per_night": Decimal("6500.00"), "max_occupancy": 2})
            suite, _ = RoomType.objects.get_or_create(property=prop, name="Himalayan Suite", defaults={"base_price_per_night": Decimal("14500.00"), "max_occupancy": 4})
            for index in range(8):
                Room.objects.get_or_create(room_number=str(101 + index), defaults={"room_type": king if index < 6 else suite, "floor": 1, "status": RoomStatus.AVAILABLE, "notes": "Fictional demo room."})
        self.stdout.write(self.style.SUCCESS("Cloud demo is ready: Himalayan Haven (Demo), 8 rooms, zero-price sample module access. Open it from the platform owner's hotel directory using Impersonate."))
