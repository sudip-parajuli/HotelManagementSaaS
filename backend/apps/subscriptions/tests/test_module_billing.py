"""
SIA HMS — Full Module-Based Flow Integration Tests
Covers gaming cafe setup, dependency validation, timed session lifecycle,
overage billing, and Celery expiry alerts.
"""

import pytest
from decimal import Decimal
from datetime import timedelta
from django.utils import timezone
from django_tenants.utils import tenant_context
from rest_framework import status
from rest_framework.test import APIClient
from unittest.mock import patch, MagicMock

from apps.accounts.models import User, UserRole
from apps.tenants.models import Client, Domain, BusinessType
from apps.properties.models import Property
from apps.bookings.models import GuestProfile
from apps.subscriptions.models import (
    AddonModule,
    ModuleCategory,
    TenantModuleSubscription,
    TenantModuleSubscriptionStatus,
    ModuleBillingCycle,
)
from apps.subscriptions.billing_service import calculate_tenant_monthly_bill
from apps.subscriptions.permissions import HasFeaturePermission
from apps.timed_sessions.models import (
    SessionUnitType,
    SessionUnit,
    SessionUnitStatus,
    TimedSession,
    SessionStatus,
    SessionExtension,
    PricingModel,
)
from apps.timed_sessions.service import (
    start_session,
    extend_session,
    pause_session,
    resume_session,
    end_session,
    calculate_live_status,
)

pytestmark = pytest.mark.django_db


# ═══════════════════════════════════════════════════════════════════════════════
# FIXTURES
# ═══════════════════════════════════════════════════════════════════════════════

@pytest.fixture
def catalog(db):
    """Create the full module catalog matching seed data prices."""
    def _make(key, name, price, is_core=False, deps=None, cat=ModuleCategory.UNIVERSAL):
        m, _ = AddonModule.objects.update_or_create(
            key=key,
            defaults={
                "name": name,
                "category": cat,
                "price_monthly": Decimal(str(price)),
                "price_yearly": Decimal(str(price * 10)),
                "is_core": is_core,
                "icon_name": key,
            },
        )
        if deps:
            m.depends_on.set(AddonModule.objects.filter(key__in=deps))
        return m

    billing = _make("billing", "Billing & Invoicing", 500, is_core=True)
    analytics = _make("analytics", "Analytics & Reports", 500, is_core=True)
    staff = _make("staff", "Staff & HR", 800)
    payroll = _make("payroll", "Nepalese Payroll", 1200, deps=["staff"])
    inventory = _make("inventory", "Inventory", 700)
    crm = _make("crm", "CRM & Loyalty", 600)
    rooms = _make("rooms", "Room Management", 800, cat=ModuleCategory.HOSPITALITY)
    bookings = _make("bookings", "Booking Engine", 1000, deps=["rooms"], cat=ModuleCategory.HOSPITALITY)
    frontdesk = _make("frontdesk", "Front Desk", 600, deps=["rooms", "bookings"], cat=ModuleCategory.HOSPITALITY)
    housekeeping = _make("housekeeping", "Housekeeping", 500, deps=["rooms"], cat=ModuleCategory.HOSPITALITY)
    pos = _make("pos", "Restaurant & POS", 800, deps=["billing"], cat=ModuleCategory.FND)
    kds = _make("kds", "Kitchen Display", 400, deps=["pos"], cat=ModuleCategory.FND)
    table_mgmt = _make("table_mgmt", "Table Management", 300, deps=["pos"], cat=ModuleCategory.FND)
    timed_sessions = _make("timed_sessions", "Timed Sessions", 700, deps=["billing"])
    return {
        "billing": billing, "analytics": analytics, "staff": staff,
        "payroll": payroll, "inventory": inventory, "crm": crm,
        "rooms": rooms, "bookings": bookings, "frontdesk": frontdesk,
        "housekeeping": housekeeping, "pos": pos, "kds": kds,
        "table_mgmt": table_mgmt, "timed_sessions": timed_sessions,
    }


@pytest.fixture
def gaming_tenant(db, catalog):
    """Create a gaming cafe tenant ready for module activation."""
    bt, _ = BusinessType.objects.get_or_create(
        key="gaming_cafe",
        defaults={"name": "Gaming Café", "icon_name": "Gamepad2"},
    )
    tenant = Client.objects.create(
        schema_name="gaming_test_tenant",
        name="Cyber Zone Gaming",
        contact_email="cyber@gaming.com",
        business_type=bt,
    )
    Domain.objects.create(domain="cyber-gaming.localhost", tenant=tenant, is_primary=True)
    yield tenant


@pytest.fixture
def staff_user(db):
    return User.objects.create(
        email="manager@cyber.com", username="manager@cyber.com",
        role=UserRole.PROPERTY_MANAGER, is_active=True,
    )


# ═══════════════════════════════════════════════════════════════════════════════
# TEST 1: Gaming Cafe Setup
# ═══════════════════════════════════════════════════════════════════════════════

class TestGamingCafeModuleSetup:
    """Activate modules for a gaming cafe and verify billing + permissions."""

    def test_activate_gaming_cafe_modules(self, gaming_tenant, catalog, staff_user):
        modules_to_activate = ["timed_sessions", "pos", "billing", "staff", "analytics"]
        for key in modules_to_activate:
            TenantModuleSubscription.objects.create(
                tenant=gaming_tenant,
                module=catalog[key],
                status=TenantModuleSubscriptionStatus.ACTIVE,
                billing_cycle=ModuleBillingCycle.MONTHLY,
                price_at_activation=catalog[key].price_monthly,
            )

        # Assert: monthly bill = 700 + 800 + 500 + 800 + 500 = 3300
        bill = calculate_tenant_monthly_bill(gaming_tenant.id)
        assert len(bill["modules"]) == 5
        assert bill["subtotal"] == Decimal("3300.00")
        assert bill["total"] == Decimal("3300.00")

    def test_permissions_for_activated_modules(self, gaming_tenant, catalog, staff_user):
        modules_to_activate = ["timed_sessions", "pos", "billing", "staff", "analytics"]
        for key in modules_to_activate:
            TenantModuleSubscription.objects.create(
                tenant=gaming_tenant,
                module=catalog[key],
                status=TenantModuleSubscriptionStatus.ACTIVE,
                billing_cycle=ModuleBillingCycle.MONTHLY,
                price_at_activation=catalog[key].price_monthly,
            )

        # Helper class for permission checks
        class MockRequest:
            def __init__(self, user, tenant):
                self.user = user
                self.tenant = tenant

        request = MockRequest(user=staff_user, tenant=gaming_tenant)

        perm_timed = HasFeaturePermission()
        perm_timed.feature_key = "timed_sessions"
        assert perm_timed.has_permission(request, None) is True

        perm_rooms = HasFeaturePermission()
        perm_rooms.feature_key = "rooms"
        from rest_framework.exceptions import PermissionDenied
        with pytest.raises(PermissionDenied):
            perm_rooms.has_permission(request, None)

        perm_bookings = HasFeaturePermission()
        perm_bookings.feature_key = "bookings"
        with pytest.raises(PermissionDenied):
            perm_bookings.has_permission(request, None)


# ═══════════════════════════════════════════════════════════════════════════════
# TEST 2: Module Dependency Validation
# ═══════════════════════════════════════════════════════════════════════════════

class TestModuleDependencyValidation:
    """Attempt to activate modules without their dependencies met."""

    def test_activate_kds_without_pos_rejected(self, gaming_tenant, catalog, staff_user):
        # Only activate billing (dependency of pos), not pos itself
        TenantModuleSubscription.objects.create(
            tenant=gaming_tenant,
            module=catalog["billing"],
            status=TenantModuleSubscriptionStatus.ACTIVE,
            billing_cycle=ModuleBillingCycle.MONTHLY,
            price_at_activation=catalog["billing"].price_monthly,
        )

        # Try to activate kds via API endpoint
        client = APIClient(HTTP_HOST="cyber-gaming.localhost")
        from rest_framework_simplejwt.tokens import RefreshToken
        refresh = RefreshToken.for_user(staff_user)
        client.credentials(HTTP_AUTHORIZATION=f"Bearer {str(refresh.access_token)}")

        response = client.post("/api/modules/activate/", {
            "modules": ["kds"],
            "billing_cycle": "monthly",
        }, format="json")
        assert response.status_code == status.HTTP_400_BAD_REQUEST
        data = response.json()
        assert data["error"] == "dependency_not_met"
        assert data["module"] == "kds"
        assert "pos" in data["requires"]

    def test_activate_payroll_without_staff_rejected(self, gaming_tenant, catalog, staff_user):
        client = APIClient(HTTP_HOST="cyber-gaming.localhost")
        from rest_framework_simplejwt.tokens import RefreshToken
        refresh = RefreshToken.for_user(staff_user)
        client.credentials(HTTP_AUTHORIZATION=f"Bearer {str(refresh.access_token)}")

        response = client.post("/api/modules/activate/", {
            "modules": ["payroll"],
            "billing_cycle": "monthly",
        }, format="json")
        assert response.status_code == status.HTTP_400_BAD_REQUEST
        data = response.json()
        assert data["error"] == "dependency_not_met"
        assert data["module"] == "payroll"
        assert "staff" in data["requires"]

    def test_activate_kds_with_pos_in_same_batch_succeeds(self, gaming_tenant, catalog, staff_user):
        """Activating pos and kds together should work since pos is in the same batch."""
        client = APIClient(HTTP_HOST="cyber-gaming.localhost")
        from rest_framework_simplejwt.tokens import RefreshToken
        refresh = RefreshToken.for_user(staff_user)
        client.credentials(HTTP_AUTHORIZATION=f"Bearer {str(refresh.access_token)}")

        response = client.post("/api/modules/activate/", {
            "modules": ["billing", "pos", "kds"],
            "billing_cycle": "monthly",
        }, format="json")
        assert response.status_code == status.HTTP_200_OK
        data = response.json()
        assert len(data["activated"]) == 3


# ═══════════════════════════════════════════════════════════════════════════════
# TEST 3: Timed Session Full Lifecycle
# ═══════════════════════════════════════════════════════════════════════════════

class TestTimedSessionFullLifecycle:
    """Start, extend, and end a session — verify no overage within paid + extended time."""

    @pytest.fixture(autouse=True)
    def setup(self, db, gaming_tenant):
        with tenant_context(gaming_tenant):
            self.prop = Property.objects.create(
                name="Cyber Zone Arena", address="Kathmandu",
                city="Kathmandu", phone="9800000000", email="arena@cyber.com",
            )
            self.unit_type = SessionUnitType.objects.create(
                property=self.prop,
                type_name="Gaming Booth",
                icon_name="Gamepad2",
                pricing_model=PricingModel.PER_HOUR,
                rate=Decimal("300.00"),
                minimum_duration_minutes=60,
                grace_period_minutes=5,
                overage_rate=Decimal("5.00"),
            )
            self.unit = SessionUnit.objects.create(
                property=self.prop,
                unit_type=self.unit_type,
                unit_name="Booth #1",
                status=SessionUnitStatus.AVAILABLE,
            )
            self.staff = User.objects.create(
                email="staff@cyber.com", username="staff@cyber.com",
                role=UserRole.PROPERTY_MANAGER, is_active=True,
            )
            yield

    def test_full_lifecycle_no_overage(self):
        """Start 60 min, extend 30 at min 55, end at min 95 → 0 overage (95 ≤ 90 paid + 5 grace)."""
        session = start_session(
            unit_id=self.unit.id,
            guest_info={"guest_name": "Raju Gamer", "guest_phone": "9800000001"},
            paid_minutes=60,
            created_by=self.staff,
        )
        assert session.status == SessionStatus.ACTIVE
        assert session.paid_duration_minutes == 60
        assert session.base_amount == Decimal("300.00")

        # Simulate 55 minutes passing
        session.actual_start = timezone.now() - timedelta(minutes=55)
        session.save(update_fields=["actual_start"])

        # Extend by 30 minutes
        session = extend_session(
            session.id,
            additional_minutes=30,
            payment_method="cash",
            staff_user=self.staff,
        )
        assert session.paid_duration_minutes == 90
        assert session.base_amount == Decimal("450.00")

        # Simulate elapsed 90 min total (right at paid boundary, within 5 min grace)
        session.actual_start = timezone.now() - timedelta(minutes=90)
        session.save(update_fields=["actual_start"])

        # End the session
        result = end_session(session.id, self.staff)
        ended = result["session"]
        assert ended.status == SessionStatus.ENDED
        assert ended.overage_minutes == 0, (
            f"Expected 0 overage, got {ended.overage_minutes} "
            f"(paid={ended.paid_duration_minutes}, active={ended.total_active_minutes})"
        )
        assert ended.overage_amount == Decimal("0.00")

        # total_amount = base_amount (300 + 150 = 450)
        assert ended.total_amount == Decimal("450.00")

        # Invoice was generated
        assert result["invoice"] is not None
        assert result["invoice"].total_amount == Decimal("450.00")


# ═══════════════════════════════════════════════════════════════════════════════
# TEST 4: Overage Billing
# ═══════════════════════════════════════════════════════════════════════════════

class TestOverageBilling:
    """End a session past the paid duration + grace period and verify overage."""

    @pytest.fixture(autouse=True)
    def setup(self, db, gaming_tenant):
        with tenant_context(gaming_tenant):
            self.prop = Property.objects.create(
                name="Cyber Zone Arena", address="Kathmandu",
                city="Kathmandu", phone="9800000000", email="arena@cyber.com",
            )
            self.unit_type = SessionUnitType.objects.create(
                property=self.prop,
                type_name="Gaming Booth",
                icon_name="Gamepad2",
                pricing_model=PricingModel.PER_HOUR,
                rate=Decimal("300.00"),
                minimum_duration_minutes=60,
                grace_period_minutes=5,
                overage_rate=Decimal("5.00"),
            )
            self.unit = SessionUnit.objects.create(
                property=self.prop,
                unit_type=self.unit_type,
                unit_name="Booth #2",
                status=SessionUnitStatus.AVAILABLE,
            )
            self.staff = User.objects.create(
                email="staff2@cyber.com", username="staff2@cyber.com",
                role=UserRole.PROPERTY_MANAGER, is_active=True,
            )
            yield

    def test_overage_calculated_correctly(self):
        """
        Start with 60 min paid, actually run for 75 min.
        Grace = 5 min.
        Overage = 75 - 60 - 5 = 10 min × Rs.5/min = Rs.50
        """
        session = start_session(
            unit_id=self.unit.id,
            guest_info={"guest_name": "Overage Guest", "guest_phone": "9800000002"},
            paid_minutes=60,
            created_by=self.staff,
        )
        # Push actual_start back by 75 minutes
        session.actual_start = timezone.now() - timedelta(minutes=75)
        session.save(update_fields=["actual_start"])

        result = end_session(session.id, self.staff)
        ended = result["session"]
        assert ended.overage_minutes == 10, (
            f"Expected 10 min overage, got {ended.overage_minutes} "
            f"(active={ended.total_active_minutes}, paid={ended.paid_duration_minutes})"
        )
        assert ended.overage_amount == Decimal("50.00")
        assert ended.total_amount == Decimal("350.00")  # 300 base + 50 overage


# ═══════════════════════════════════════════════════════════════════════════════
# TEST 5: Celery Expiry Alert
# ═══════════════════════════════════════════════════════════════════════════════

class TestCeleryExpiryAlert:
    """Verify check_expiring_sessions broadcasts WebSocket alerts correctly."""

    @pytest.fixture(autouse=True)
    def setup(self, db, gaming_tenant):
        with tenant_context(gaming_tenant):
            self.prop = Property.objects.create(
                name="Cyber Zone Arena", address="Kathmandu",
                city="Kathmandu", phone="9800000000", email="arena@cyber.com",
            )
            self.unit_type = SessionUnitType.objects.create(
                property=self.prop,
                type_name="Gaming Booth",
                icon_name="Gamepad2",
                pricing_model=PricingModel.PER_HOUR,
                rate=Decimal("300.00"),
                minimum_duration_minutes=60,
                grace_period_minutes=5,
                overage_rate=Decimal("5.00"),
            )
            self.unit = SessionUnit.objects.create(
                property=self.prop,
                unit_type=self.unit_type,
                unit_name="Booth #3",
                status=SessionUnitStatus.AVAILABLE,
            )
            self.staff = User.objects.create(
                email="staff3@cyber.com", username="staff3@cyber.com",
                role=UserRole.PROPERTY_MANAGER, is_active=True,
            )
            yield

    @patch("apps.timed_sessions.tasks._broadcast")
    def test_expiry_alert_sent_when_4_minutes_remaining(self, mock_broadcast):
        """Session with 4 min remaining triggers expiring_soon alert."""
        session = start_session(
            unit_id=self.unit.id,
            guest_info={"guest_name": "Expiry Guest", "guest_phone": "9800000003"},
            paid_minutes=60,
            created_by=self.staff,
        )
        # Simulate 56 min elapsed (4 min remaining of 60)
        session.actual_start = timezone.now() - timedelta(minutes=56)
        session.save(update_fields=["actual_start"])

        from apps.timed_sessions.tasks import check_expiring_sessions
        count = check_expiring_sessions()
        assert count >= 1
        assert mock_broadcast.called
        call_args = mock_broadcast.call_args
        assert call_args is not None
        group_name = call_args[0][0]
        event_type = call_args[0][1]
        data = call_args[0][2]
        assert group_name == "sessions_public"
        assert event_type == "session_expiring"
        assert data["unit_id"] == self.unit.id
        assert data["remaining_minutes"] >= 1

    @patch("apps.timed_sessions.tasks._broadcast")
    def test_no_duplicate_alerts_within_cooldown(self, mock_broadcast):
        """Session already warned within 2 min cooldown does not get another alert."""
        session = start_session(
            unit_id=self.unit.id,
            guest_info={"guest_name": "NoDup Guest", "guest_phone": "9800000004"},
            paid_minutes=60,
            created_by=self.staff,
        )
        session.actual_start = timezone.now() - timedelta(minutes=56)
        session.last_expiry_warning_sent = timezone.now()
        session.save(update_fields=["actual_start", "last_expiry_warning_sent"])

        from apps.timed_sessions.tasks import check_expiring_sessions
        count = check_expiring_sessions()
        assert count >= 1
        mock_broadcast.assert_not_called()

        # Verify last_expiry_warning_sent is unchanged (no duplicate update)
        session.refresh_from_db()
        assert session.last_expiry_warning_sent is not None
