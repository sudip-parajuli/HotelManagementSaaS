"""
SIA HMS — Modular Billing & Feature Gating Tests
Tests for:
  - calculate_tenant_monthly_bill with 3 modules
  - generate_monthly_invoice produces correct line items
  - HasFeaturePermission returns 403 when module not subscribed
  - HasFeaturePermission returns 200 when TenantFeatureGrant exists (override)
"""

import pytest
from decimal import Decimal
from django.utils import timezone
from rest_framework import status

from apps.accounts.models import User, UserRole
from apps.tenants.models import Client, Domain, BusinessType
from apps.subscriptions.models import (
    AddonModule,
    ModuleCategory,
    TenantModuleSubscription,
    TenantModuleSubscriptionStatus,
    TenantFeatureGrant,
    ModuleBillingCycle,
)
from apps.subscriptions.billing_service import (
    calculate_tenant_monthly_bill,
    generate_monthly_invoice,
)
from apps.subscriptions.permissions import HasFeaturePermission
from rest_framework.exceptions import PermissionDenied

pytestmark = pytest.mark.django_db


# ─── Fixtures ─────────────────────────────────────────────────────────────────

@pytest.fixture
def modules(db):
    """Create test modules for billing tests using unique test keys."""
    billing, _ = AddonModule.objects.update_or_create(
        key="test_billing",
        defaults={
            "name": "Billing & Invoicing",
            "description": "Test billing module",
            "category": ModuleCategory.UNIVERSAL,
            "icon_name": "Receipt",
            "price_monthly": Decimal("500.00"),
            "price_yearly": Decimal("5400.00"),
            "is_core": True,
        },
    )
    pos, _ = AddonModule.objects.update_or_create(
        key="test_pos",
        defaults={
            "name": "Restaurant & POS",
            "description": "Test POS module",
            "category": ModuleCategory.FND,
            "icon_name": "Utensils",
            "price_monthly": Decimal("800.00"),
            "price_yearly": Decimal("8640.00"),
            "is_core": False,
        },
    )
    pos.depends_on.add(billing)
    staff, _ = AddonModule.objects.update_or_create(
        key="test_staff",
        defaults={
            "name": "Staff & HR",
            "description": "Test staff module",
            "category": ModuleCategory.UNIVERSAL,
            "icon_name": "Users",
            "price_monthly": Decimal("800.00"),
            "price_yearly": Decimal("8640.00"),
            "is_core": False,
        },
    )
    return {"billing": billing, "pos": pos, "staff": staff}


@pytest.fixture
def tenant_with_subscriptions(db, modules):
    """Create a test tenant with active module subscriptions."""
    tenant = Client.objects.create(
        schema_name="test_billing_tenant",
        name="Billing Test Hotel",
        contact_email="billing@test.com",
    )
    Domain.objects.create(
        domain="billing-test.localhost",
        tenant=tenant,
        is_primary=True,
    )

    # Activate billing (core) and staff modules
    TenantModuleSubscription.objects.create(
        tenant=tenant,
        module=modules["billing"],
        status=TenantModuleSubscriptionStatus.ACTIVE,
        billing_cycle=ModuleBillingCycle.MONTHLY,
        price_at_activation=modules["billing"].price_monthly,
    )
    TenantModuleSubscription.objects.create(
        tenant=tenant,
        module=modules["staff"],
        status=TenantModuleSubscriptionStatus.ACTIVE,
        billing_cycle=ModuleBillingCycle.MONTHLY,
        price_at_activation=modules["staff"].price_monthly,
    )

    return tenant


# ─── calculate_tenant_monthly_bill Tests ─────────────────────────────────────

class TestCalculateTenantMonthlyBill:
    """Tests for the billing calculation service."""

    def test_with_three_modules(self, tenant_with_subscriptions, modules):
        """calculate_tenant_monthly_bill sums prices for 3 active modules."""
        tenant = tenant_with_subscriptions

        # Add a third module
        TenantModuleSubscription.objects.create(
            tenant=tenant,
            module=modules["pos"],
            status=TenantModuleSubscriptionStatus.ACTIVE,
            billing_cycle=ModuleBillingCycle.MONTHLY,
            price_at_activation=modules["pos"].price_monthly,
        )

        result = calculate_tenant_monthly_bill(tenant.id)

        assert len(result["modules"]) == 3
        assert result["subtotal"] == Decimal("2100.00")  # 500 + 800 + 800
        assert result["any_discounts"] == Decimal("0.00")
        assert result["total"] == Decimal("2100.00")

        # Verify module detail keys
        module_keys = {m["module_key"] for m in result["modules"]}
        assert module_keys == {"test_billing", "test_pos", "test_staff"}

    def test_excludes_cancelled_subscriptions(self, tenant_with_subscriptions, modules):
        """Cancelled subscriptions should not be included in billing."""
        tenant = tenant_with_subscriptions

        # Cancel staff
        TenantModuleSubscription.objects.filter(
            tenant=tenant, module=modules["staff"]
        ).update(status=TenantModuleSubscriptionStatus.CANCELLED)

        result = calculate_tenant_monthly_bill(tenant.id)

        assert len(result["modules"]) == 1
        assert result["total"] == Decimal("500.00")

    def test_empty_bill_for_no_active_modules(self, tenant_with_subscriptions, modules):
        """Tenant with no active modules should have empty bill."""
        tenant = tenant_with_subscriptions
        TenantModuleSubscription.objects.filter(tenant=tenant).update(
            status=TenantModuleSubscriptionStatus.CANCELLED
        )

        result = calculate_tenant_monthly_bill(tenant.id)

        assert len(result["modules"]) == 0
        assert result["subtotal"] == Decimal("0.00")
        assert result["total"] == Decimal("0.00")

    def test_yearly_billing_normalised_to_monthly(self, tenant_with_subscriptions, modules):
        """Yearly subscription should normalise price to monthly."""
        tenant = tenant_with_subscriptions
        TenantModuleSubscription.objects.filter(tenant=tenant).delete()

        # Add a yearly subscription
        TenantModuleSubscription.objects.create(
            tenant=tenant,
            module=modules["billing"],
            status=TenantModuleSubscriptionStatus.ACTIVE,
            billing_cycle=ModuleBillingCycle.YEARLY,
            price_at_activation=modules["billing"].price_yearly,  # 5400
        )

        result = calculate_tenant_monthly_bill(tenant.id)

        assert len(result["modules"]) == 1
        assert result["modules"][0]["billing_cycle"] == ModuleBillingCycle.YEARLY
        assert result["subtotal"] == Decimal("450.00")  # 5400 / 12
        assert result["total"] == Decimal("450.00")


# ─── generate_monthly_invoice Tests ──────────────────────────────────────────

class TestGenerateMonthlyInvoice:
    """Tests for invoice generation from module subscriptions."""

    def test_produces_correct_line_items(self, tenant_with_subscriptions):
        """Invoice should have line items matching active modules."""
        tenant = tenant_with_subscriptions
        invoice = generate_monthly_invoice(tenant.id)

        assert invoice.tenant_id == tenant.id
        assert invoice.total == Decimal("1300.00")  # 500 + 800
        assert invoice.subtotal == Decimal("1300.00")
        assert invoice.discounts == Decimal("0.00")

        # Check line items
        line_items = invoice.line_items.all()
        assert line_items.count() == 2

        line_item_names = {li.module_name for li in line_items}
        assert line_item_names == {"Billing & Invoicing", "Staff & HR"}

        total_from_lines = sum(li.amount for li in line_items)
        assert total_from_lines == invoice.total

    def test_next_billing_date_updated(self, tenant_with_subscriptions):
        """Active subscriptions should have next_billing_date set."""
        invoice = generate_monthly_invoice(tenant_with_subscriptions.id)

        updated_subs = TenantModuleSubscription.objects.filter(
            tenant=tenant_with_subscriptions
        )
        for sub in updated_subs:
            assert sub.next_billing_date is not None

    def test_invoice_status_is_pending(self, tenant_with_subscriptions):
        """New invoices should be in PENDING status."""
        invoice = generate_monthly_invoice(tenant_with_subscriptions.id)
        assert invoice.status == "pending"


# ─── HasFeaturePermission Tests ──────────────────────────────────────────────

class MockRequest:
    """Minimal request mock for testing permissions."""

    def __init__(self, user, tenant):
        self.user = user
        self.tenant = tenant


class TestHasFeaturePermission:
    """Tests for the feature gating permission class."""

    @pytest.fixture
    def tenant_and_user(self, modules):
        """Create a tenant with a non-superadmin user."""
        tenant = Client.objects.create(
            schema_name="perm_test_tenant",
            name="Permission Test Hotel",
            contact_email="perm@test.com",
        )
        Domain.objects.create(
            domain="perm-test.localhost",
            tenant=tenant,
            is_primary=True,
        )
        user = User.objects.create(
            email="manager@permtest.com",
            username="manager@permtest.com",
            role=UserRole.PROPERTY_MANAGER,
            is_active=True,
        )
        return tenant, user

    def test_returns_403_when_module_not_subscribed(self, tenant_and_user, modules):
        """HasFeaturePermission should deny when module not subscribed."""
        tenant, user = tenant_and_user

        # test_billing is NOT activated for this tenant
        perm = HasFeaturePermission()
        perm.feature_key = "test_billing"
        request = MockRequest(user=user, tenant=tenant)

        with pytest.raises(PermissionDenied) as excinfo:
            perm.has_permission(request, None)

        assert excinfo.value.detail["error"] == "module_not_activated"
        assert excinfo.value.detail["module"] == "test_billing"

    def test_returns_true_when_module_is_subscribed(self, tenant_and_user, modules):
        """HasFeaturePermission should allow when module is subscribed."""
        tenant, user = tenant_and_user

        # Activate billing module
        TenantModuleSubscription.objects.create(
            tenant=tenant,
            module=modules["billing"],
            status=TenantModuleSubscriptionStatus.ACTIVE,
            billing_cycle=ModuleBillingCycle.MONTHLY,
            price_at_activation=modules["billing"].price_monthly,
        )

        perm = HasFeaturePermission()
        perm.feature_key = "test_billing"
        request = MockRequest(user=user, tenant=tenant)

        result = perm.has_permission(request, None)
        assert result is True

    def test_tenant_feature_grant_overrides_missing_subscription(self, tenant_and_user, modules):
        """TenantFeatureGrant should allow access even without subscription."""
        tenant, user = tenant_and_user

        # Grant feature manually (no subscription)
        TenantFeatureGrant.objects.create(
            tenant=tenant,
            feature_key="test_payroll",
            granted_by=user,
            is_active=True,
        )

        perm = HasFeaturePermission()
        perm.feature_key = "test_payroll"
        request = MockRequest(user=user, tenant=tenant)

        result = perm.has_permission(request, None)
        assert result is True

    def test_super_admin_bypasses_gates(self, tenant_and_user):
        """Super Admin should bypass all feature gates."""
        tenant, _ = tenant_and_user
        super_admin = User.objects.create(
            email="super@admin.com",
            username="super@admin.com",
            role=UserRole.SUPER_ADMIN,
            is_active=True,
        )

        perm = HasFeaturePermission()
        perm.feature_key = "nonexistent"
        request = MockRequest(user=super_admin, tenant=tenant)

        result = perm.has_permission(request, None)
        assert result is True

    def test_unauthenticated_user_denied(self, tenant_and_user):
        """Unauthenticated users should be denied."""
        tenant, _ = tenant_and_user
        # An AnonymousUser from Django's auth
        from django.contrib.auth.models import AnonymousUser
        anonymous = AnonymousUser()

        perm = HasFeaturePermission()
        perm.feature_key = "test_billing"
        request = MockRequest(user=anonymous, tenant=tenant)

        assert perm.has_permission(request, None) is False

    def test_expired_grant_does_not_override(self, tenant_and_user, modules):
        """Expired TenantFeatureGrant should not provide access."""
        tenant, user = tenant_and_user
        from datetime import timedelta

        TenantFeatureGrant.objects.create(
            tenant=tenant,
            feature_key="test_crm",
            granted_by=user,
            is_active=True,
            expires_at=timezone.localdate() - timedelta(days=1),
        )

        perm = HasFeaturePermission()
        perm.feature_key = "test_crm"
        request = MockRequest(user=user, tenant=tenant)

        with pytest.raises(PermissionDenied):
            perm.has_permission(request, None)
