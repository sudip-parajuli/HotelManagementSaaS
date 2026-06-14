"""
SIA HMS — Management Command: create_tenant
Creates a new hotel tenant with domain and initial superadmin user.

Usage:
    python manage.py create_tenant \
        --name "Hotel Paraiso" \
        --schema "hotel_paraiso" \
        --domain "paraiso" \
        --admin-email "admin@paraiso.com" \
        --admin-password "SecurePassword123!" \
        [--plan professional]
"""

import re
from django.core.management.base import BaseCommand, CommandError
from django.db import connection


class Command(BaseCommand):
    help = "Create a new hotel tenant with domain and admin user"

    def add_arguments(self, parser):
        parser.add_argument("--name", required=True, help="Hotel name")
        parser.add_argument("--schema", required=True, help="PostgreSQL schema name (e.g., hotel_paraiso)")
        parser.add_argument("--domain", required=True, help="Subdomain prefix (e.g., paraiso)")
        parser.add_argument("--admin-email", required=True, help="Initial admin email")
        parser.add_argument("--admin-password", default="ChangeMe123!", help="Initial admin password")
        parser.add_argument("--contact-phone", default="", help="Hotel contact phone")
        parser.add_argument(
            "--plan",
            default="starter",
            choices=["starter", "professional", "enterprise", "private_install"],
            help="Subscription plan",
        )
        parser.add_argument(
            "--base-domain",
            default="siaenterprises.com.np",
            help="Base domain (default: siaenterprises.com.np)",
        )

    def handle(self, *args, **options):
        from apps.tenants.models import Client, Domain

        schema = options["schema"].lower().replace("-", "_")
        domain_prefix = options["domain"].lower()
        base_domain = options["base_domain"]
        full_domain = f"{domain_prefix}.{base_domain}"

        # Validate schema name
        if not re.match(r"^[a-z][a-z0-9_]{2,62}$", schema):
            raise CommandError(
                f"Invalid schema name '{schema}'. Must be lowercase letters, numbers, underscores. "
                "Between 3 and 63 characters. Must start with a letter."
            )

        # Check if schema already exists
        if Client.objects.filter(schema_name=schema).exists():
            raise CommandError(f"Tenant with schema '{schema}' already exists.")

        if Domain.objects.filter(domain=full_domain).exists():
            raise CommandError(f"Domain '{full_domain}' is already in use.")

        self.stdout.write(f"\n🏨 Creating tenant: {options['name']}")
        self.stdout.write(f"   Schema:  {schema}")
        self.stdout.write(f"   Domain:  {full_domain}")
        self.stdout.write(f"   Plan:    {options['plan']}")
        self.stdout.write(f"   Admin:   {options['admin_email']}\n")

        # Create the Client (this auto-creates the PostgreSQL schema)
        try:
            tenant = Client(
                schema_name=schema,
                name=options["name"],
                contact_email=options["admin_email"],
                contact_phone=options["contact_phone"],
                subscription_plan=options["plan"],
                is_active=True,
            )
            tenant.save()
            self.stdout.write(self.style.SUCCESS(f"✅ Schema '{schema}' created"))
        except Exception as e:
            raise CommandError(f"Failed to create tenant: {e}")

        # Create domain
        try:
            Domain.objects.create(
                domain=full_domain,
                tenant=tenant,
                is_primary=True,
            )
            self.stdout.write(self.style.SUCCESS(f"✅ Domain '{full_domain}' registered"))
        except Exception as e:
            raise CommandError(f"Failed to create domain: {e}")

        # Create admin user in the tenant schema
        try:
            from django_tenants.utils import tenant_context

            with tenant_context(tenant):
                from apps.accounts.models import User

                if User.objects.filter(email=options["admin_email"]).exists():
                    self.stdout.write(
                        self.style.WARNING(f"⚠️  User {options['admin_email']} already exists in schema")
                    )
                else:
                    user = User.objects.create_superuser(
                        email=options["admin_email"],
                        username=options["admin_email"],
                        password=options["admin_password"],
                        role="PROPERTY_MANAGER",
                        is_active=True,
                    )
                    self.stdout.write(
                        self.style.SUCCESS(f"✅ Admin user '{user.email}' created in schema")
                    )
        except Exception as e:
            raise CommandError(f"Failed to create admin user: {e}")

        self.stdout.write("\n" + "=" * 50)
        self.stdout.write(self.style.SUCCESS("🎉 Tenant created successfully!"))
        self.stdout.write(f"   URL:      https://{full_domain}")
        self.stdout.write(f"   Login:    {options['admin_email']}")
        self.stdout.write(f"   Password: {options['admin_password']}")
        self.stdout.write("=" * 50 + "\n")
