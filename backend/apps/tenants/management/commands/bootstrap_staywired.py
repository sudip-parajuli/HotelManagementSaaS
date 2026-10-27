"""Idempotent initial public tenant, module catalog and owner account setup."""
import os
from django.core.management import BaseCommand, CommandError, call_command
from django.db import connection, transaction
from django_tenants.utils import schema_context


class Command(BaseCommand):
    help = "Bootstrap Staywired on an already-migrated database using secret environment variables."

    def handle(self, *args, **options):
        from apps.accounts.models import User, UserRole
        from apps.tenants.models import Client, Domain
        from django.apps import apps
        email = os.environ.get("STAYWIRED_ADMIN_EMAIL", "").strip()
        password = os.environ.get("STAYWIRED_ADMIN_PASSWORD", "")
        if not email or len(password) < 16:
            raise CommandError("Set STAYWIRED_ADMIN_EMAIL and a unique STAYWIRED_ADMIN_PASSWORD of at least 16 characters.")
        with schema_context("public"), transaction.atomic():
            public, _ = Client.objects.get_or_create(schema_name="public", defaults={"name": "Staywired Platform", "contact_email": email})
            for host in ["staywired-api.vercel.app", "staywired.vercel.app"]:
                domain, created = Domain.objects.get_or_create(domain=host, defaults={"tenant": public, "is_primary": host == "staywired.vercel.app"})
                if domain.tenant_id != public.id:
                    raise CommandError("A deployment domain already belongs to another tenant; refusing to overwrite it.")
            user = User.objects.filter(email=email).first()
            if user is None:
                user = User(username=email, email=email, first_name="Staywired", last_name="Owner", role=UserRole.SUPER_ADMIN, is_staff=True, is_superuser=True, is_active=True)
                user.set_password(password)
                user.save()
                self.stdout.write("Created the platform owner. Credentials remain in the local secret configuration.")
            elif user.role != UserRole.SUPER_ADMIN:
                raise CommandError("The owner email belongs to a non-platform user; refusing to elevate it.")
            else:
                self.stdout.write("Existing platform owner preserved; password unchanged.")
            # Supabase grants Data API roles default table privileges. RLS with
            # no public policies denies browser access; the trusted backend uses
            # the database role, while Supabase's own schemas remain untouched.
            public_tables = set(connection.introspection.table_names())
            model_tables = {m._meta.db_table for m in apps.get_models(include_auto_created=True)}
            model_tables.add("django_migrations")
            with connection.cursor() as cursor:
                for table in sorted(public_tables & model_tables):
                    cursor.execute(f'ALTER TABLE public.{connection.ops.quote_name(table)} ENABLE ROW LEVEL SECURITY')
            self.stdout.write("Enabled RLS on Django-owned public tables; no anonymous policies were added.")
        call_command("seed_modules", stdout=self.stdout)
        self.stdout.write(self.style.SUCCESS("Staywired public tenant, owner and module catalog are ready."))
