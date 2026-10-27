"""
SIA HMS — Timed Sessions Service Unit Tests
Tests all service functions (start, extend, pause, resume, end)
with various duration and overage combinations.
"""

import pytest
from decimal import Decimal
from datetime import timedelta
from django.utils import timezone
from django_tenants.utils import tenant_context

from apps.accounts.models import User, UserRole
from apps.tenants.models import Client, Domain
from apps.properties.models import Property
from apps.bookings.models import GuestProfile
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
# HELPERS
# ═══════════════════════════════════════════════════════════════════════════════

def _create_unit(prop, rate=Decimal("300"), model=PricingModel.PER_HOUR,
                 min_dur=60, grace=5, overage_rate=Decimal("5")):
    ut = SessionUnitType.objects.create(
        property=prop,
        type_name="Test Unit Type",
        icon_name="Gamepad2",
        pricing_model=model,
        rate=rate,
        minimum_duration_minutes=min_dur,
        grace_period_minutes=grace,
        overage_rate=overage_rate,
    )
    return SessionUnit.objects.create(
        property=prop,
        unit_type=ut,
        unit_name="Test Unit",
        status=SessionUnitStatus.AVAILABLE,
    )


# ═══════════════════════════════════════════════════════════════════════════════
# FIXTURES
# ═══════════════════════════════════════════════════════════════════════════════

@pytest.fixture
def tenant(db):
    t = Client.objects.create(
        schema_name="sessions_test",
        name="Sessions Test",
        contact_email="test@sessions.com",
    )
    Domain.objects.create(domain="sessions-test.localhost", tenant=t, is_primary=True)
    yield t


@pytest.fixture
def prop(tenant):
    with tenant_context(tenant):
        yield Property.objects.create(
            name="Test Arena", address="Kathmandu",
            city="Kathmandu", phone="9800000000", email="arena@test.com",
        )


@pytest.fixture
def staff(tenant):
    return User.objects.create(
        email="staff@sessions.com", username="staff@sessions.com",
        role=UserRole.PROPERTY_MANAGER, is_active=True,
    )


@pytest.fixture
def guest(tenant, prop):
    with tenant_context(tenant):
        yield GuestProfile.objects.create(
            first_name="John", last_name="Doe", phone="9812345678",
        )


@pytest.fixture
def unit(prop):
    return _create_unit(prop)


# ═══════════════════════════════════════════════════════════════════════════════
# START SESSION
# ═══════════════════════════════════════════════════════════════════════════════

class TestStartSession:
    """Start sessions with various pricing models and durations."""

    def test_per_hour_60_min(self, unit, staff):
        session = start_session(
            unit_id=unit.id,
            guest_info={"guest_name": "Alice", "guest_phone": "9800000001"},
            paid_minutes=60,
            created_by=staff,
        )
        assert session.status == SessionStatus.ACTIVE
        assert session.paid_duration_minutes == 60
        assert session.base_amount == Decimal("300.00")
        assert session.total_amount == Decimal("300.00")
        unit.refresh_from_db()
        assert unit.status == SessionUnitStatus.OCCUPIED

    def test_per_hour_30_min(self, unit, staff):
        """30 min at Rs.300/hr = Rs.150."""
        session = start_session(
            unit_id=unit.id,
            guest_info={"guest_name": "Bob"},
            paid_minutes=30,
            created_by=staff,
        )
        assert session.base_amount == Decimal("150.00")

    def test_per_hour_90_min(self, unit, staff):
        """90 min at Rs.300/hr = Rs.450."""
        session = start_session(
            unit_id=unit.id,
            guest_info={"guest_name": "Carol"},
            paid_minutes=90,
            created_by=staff,
        )
        assert session.base_amount == Decimal("450.00")

    def test_per_hour_120_min(self, unit, staff):
        """120 min at Rs.300/hr = Rs.600."""
        session = start_session(
            unit_id=unit.id,
            guest_info={"guest_name": "Dave"},
            paid_minutes=120,
            created_by=staff,
        )
        assert session.base_amount == Decimal("600.00")

    def test_per_minute_pricing(self, prop, staff):
        """Per-minute pricing: Rs.10/min × 45 min = Rs.450."""
        unit = _create_unit(prop, rate=Decimal("10"), model=PricingModel.PER_MINUTE, min_dur=1, overage_rate=Decimal("10"))
        session = start_session(
            unit_id=unit.id,
            guest_info={"guest_name": "PerMin"},
            paid_minutes=45,
            created_by=staff,
        )
        assert session.base_amount == Decimal("450.00")

    def test_flat_rate_pricing(self, prop, staff):
        """Flat rate: Rs.500 for any duration."""
        unit = _create_unit(prop, rate=Decimal("500"), model=PricingModel.FLAT_RATE, min_dur=30, overage_rate=Decimal("10"))
        session = start_session(
            unit_id=unit.id,
            guest_info={"guest_name": "Flat"},
            paid_minutes=60,
            created_by=staff,
        )
        assert session.base_amount == Decimal("500.00")

    def test_per_day_pricing(self, prop, staff):
        """Per-day: Rs.2000 for up to 24h. 10h = 1 day = Rs.2000."""
        unit = _create_unit(prop, rate=Decimal("2000"), model=PricingModel.PER_DAY, min_dur=60, overage_rate=Decimal("5"))
        session = start_session(
            unit_id=unit.id,
            guest_info={"guest_name": "Day"},
            paid_minutes=600,
            created_by=staff,
        )
        assert session.base_amount == Decimal("2000.00")

    def test_with_guest_profile(self, unit, guest, staff):
        session = start_session(
            unit_id=unit.id,
            guest_info={"guest_id": guest.id, "guest_name": "John Doe"},
            paid_minutes=60,
            created_by=staff,
        )
        assert session.guest_id == guest.id
        assert session.guest_name == "John Doe"

    def test_rejects_occupied_unit(self, unit, staff):
        start_session(unit_id=unit.id, guest_info={"guest_name": "First"},
                      paid_minutes=30, created_by=staff)
        with pytest.raises(ValueError, match="not available"):
            start_session(unit_id=unit.id, guest_info={"guest_name": "Second"},
                          paid_minutes=30, created_by=staff)


# ═══════════════════════════════════════════════════════════════════════════════
# EXTEND SESSION
# ═══════════════════════════════════════════════════════════════════════════════

class TestExtendSession:
    """Extend active sessions with various durations."""

    def test_extend_30_min(self, unit, staff):
        session = start_session(unit.id, {"guest_name": "Extend Tester"}, 60, staff)
        session = extend_session(session.id, 30, "cash", staff)
        assert session.paid_duration_minutes == 90
        assert session.base_amount == Decimal("450.00")
        ext = SessionExtension.objects.filter(session=session).first()
        assert ext is not None
        assert ext.extended_by_minutes == 30
        assert ext.additional_amount == Decimal("150.00")
        assert ext.payment_method == "cash"

    def test_extend_15_min(self, unit, staff):
        session = start_session(unit.id, {"guest_name": "Extend15"}, 60, staff)
        session = extend_session(session.id, 15, "cash", staff)
        assert session.paid_duration_minutes == 75
        assert session.base_amount == Decimal("375.00")

    def test_extend_60_min(self, unit, staff):
        session = start_session(unit.id, {"guest_name": "Extend60"}, 60, staff)
        session = extend_session(session.id, 60, "card", staff)
        assert session.paid_duration_minutes == 120
        assert session.base_amount == Decimal("600.00")

    def test_double_extension(self, unit, staff):
        """Extend twice: 30 + 30 = 60 extra min, base goes from 300 → 450 → 600."""
        session = start_session(unit.id, {"guest_name": "Double"}, 60, staff)
        session = extend_session(session.id, 30, "cash", staff)
        session = extend_session(session.id, 30, "card", staff)
        assert session.paid_duration_minutes == 120
        assert session.base_amount == Decimal("600.00")
        assert SessionExtension.objects.filter(session=session).count() == 2

    def test_extend_fails_for_ended_session(self, unit, staff):
        session = start_session(unit.id, {"guest_name": "Ended"}, 60, staff)
        result = end_session(session.id, staff)
        with pytest.raises(ValueError, match="Cannot extend"):
            extend_session(result["session"].id, 30, staff_user=staff)

    def test_extend_fails_for_cancelled_session(self, unit, staff):
        session = start_session(unit.id, {"guest_name": "Cancelled"}, 60, staff)
        session.status = SessionStatus.CANCELLED
        session.save()
        with pytest.raises(ValueError, match="Cannot extend"):
            extend_session(session.id, 30, staff_user=staff)


# ═══════════════════════════════════════════════════════════════════════════════
# PAUSE / RESUME
# ═══════════════════════════════════════════════════════════════════════════════

class TestPauseResume:
    """Pause and resume sessions, verifying status changes and paused time tracking."""

    def test_pause_active_session(self, unit, staff):
        session = start_session(unit.id, {"guest_name": "Pause Test"}, 60, staff)
        session = pause_session(session.id, staff)
        assert session.status == SessionStatus.PAUSED
        assert session.paused_at is not None

    def test_resume_paused_session(self, unit, staff):
        session = start_session(unit.id, {"guest_name": "Resume Test"}, 60, staff)
        session = pause_session(session.id, staff)
        assert session.paused_at is not None
        session = resume_session(session.id, staff)
        assert session.status == SessionStatus.ACTIVE
        assert session.paused_at is None
        # total_paused_minutes may be 0 if pause/resume happened too fast
        assert session.total_paused_minutes >= 0

    def test_pause_fails_for_ended(self, unit, staff):
        session = start_session(unit.id, {"guest_name": "End-Pause"}, 60, staff)
        result = end_session(session.id, staff)
        with pytest.raises(ValueError, match="Cannot pause"):
            pause_session(result["session"].id, staff)

    def test_pause_fails_for_paused(self, unit, staff):
        session = start_session(unit.id, {"guest_name": "Double-Pause"}, 60, staff)
        pause_session(session.id, staff)
        with pytest.raises(ValueError, match="Cannot pause"):
            pause_session(session.id, staff)

    def test_resume_fails_for_active(self, unit, staff):
        session = start_session(unit.id, {"guest_name": "Active-Resume"}, 60, staff)
        with pytest.raises(ValueError, match="Cannot resume"):
            resume_session(session.id, staff)

    def test_resume_fails_for_ended(self, unit, staff):
        session = start_session(unit.id, {"guest_name": "End-Resume"}, 60, staff)
        result = end_session(session.id, staff)
        with pytest.raises(ValueError, match="Cannot resume"):
            resume_session(result["session"].id, staff)

    def test_multiple_pause_resume_accumulates_time(self, unit, staff):
        """Two pause/resume cycles should accumulate total_paused_minutes."""
        session = start_session(unit.id, {"guest_name": "Multi"}, 60, staff)
        session = pause_session(session.id, staff)
        session = resume_session(session.id, staff)
        first_paused = session.total_paused_minutes
        session = pause_session(session.id, staff)
        session = resume_session(session.id, staff)
        assert session.total_paused_minutes >= first_paused


# ═══════════════════════════════════════════════════════════════════════════════
# END SESSION — No Overage
# ═══════════════════════════════════════════════════════════════════════════════

class TestEndSessionNoOverage:
    """End sessions exactly at or before paid time ends."""

    def test_end_exactly_at_paid_time(self, unit, staff):
        """End at exactly 60 min (within grace) → 0 overage."""
        session = start_session(unit.id, {"guest_name": "OnTime"}, 60, staff)
        session.actual_start = timezone.now() - timedelta(minutes=60)
        session.save(update_fields=["actual_start"])
        result = end_session(session.id, staff)
        s = result["session"]
        assert s.overage_minutes == 0
        assert s.overage_amount == Decimal("0.00")
        assert s.total_amount == Decimal("300.00")
        assert s.status == SessionStatus.ENDED

    def test_end_within_paid_time(self, unit, staff):
        """End at 45 min (under 60) → 0 overage."""
        session = start_session(unit.id, {"guest_name": "Under"}, 60, staff)
        session.actual_start = timezone.now() - timedelta(minutes=45)
        session.save(update_fields=["actual_start"])
        result = end_session(session.id, staff)
        assert result["session"].overage_minutes == 0

    def test_end_within_grace_period(self, unit, staff):
        """End at 63 min (3 min into grace) → 0 overage (grace=5)."""
        session = start_session(unit.id, {"guest_name": "Grace"}, 60, staff)
        session.actual_start = timezone.now() - timedelta(minutes=63)
        session.save(update_fields=["actual_start"])
        result = end_session(session.id, staff)
        assert result["session"].overage_minutes == 0

    def test_end_at_grace_boundary(self, unit, staff):
        """End at exactly 65 min (grace=5) → 0 overage."""
        session = start_session(unit.id, {"guest_name": "GraceEdge"}, 60, staff)
        session.actual_start = timezone.now() - timedelta(minutes=65)
        session.save(update_fields=["actual_start"])
        result = end_session(session.id, staff)
        assert result["session"].overage_minutes == 0

    def test_end_marks_unit_cleaning(self, unit, staff):
        session = start_session(unit.id, {"guest_name": "Clean"}, 60, staff)
        end_session(session.id, staff)
        unit.refresh_from_db()
        assert unit.status == SessionUnitStatus.CLEANING

    def test_end_generates_invoice(self, unit, staff):
        session = start_session(unit.id, {"guest_name": "Invoice"}, 60, staff)
        result = end_session(session.id, staff)
        assert result["invoice"] is not None
        invoice = result["invoice"]
        assert invoice.total_amount == Decimal("300.00")
        assert invoice.status == "unpaid"
        # Invoice has a line item for base amount
        assert invoice.items.count() >= 1


# ═══════════════════════════════════════════════════════════════════════════════
# END SESSION — Overage
# ═══════════════════════════════════════════════════════════════════════════════

class TestEndSessionWithOverage:
    """End sessions past paid time + grace and verify overage calculations."""

    def test_overage_10_min(self, unit, staff):
        """75 min elapsed, 60 paid, 5 grace → 10 min overage × Rs.5 = Rs.50."""
        session = start_session(unit.id, {"guest_name": "Over1"}, 60, staff)
        session.actual_start = timezone.now() - timedelta(minutes=75)
        session.save(update_fields=["actual_start"])
        result = end_session(session.id, staff)
        s = result["session"]
        assert s.overage_minutes == 10
        assert s.overage_amount == Decimal("50.00")
        assert s.total_amount == Decimal("350.00")

    def test_overage_30_min(self, unit, staff):
        """95 min elapsed, 60 paid, 5 grace → 30 min overage × Rs.5 = Rs.150."""
        session = start_session(unit.id, {"guest_name": "Over2"}, 60, staff)
        session.actual_start = timezone.now() - timedelta(minutes=95)
        session.save(update_fields=["actual_start"])
        result = end_session(session.id, staff)
        s = result["session"]
        assert s.overage_minutes == 30
        assert s.overage_amount == Decimal("150.00")
        assert s.total_amount == Decimal("450.00")

    def test_overage_60_min(self, unit, staff):
        """125 min elapsed, 60 paid, 5 grace → 60 min overage × Rs.5 = Rs.300."""
        session = start_session(unit.id, {"guest_name": "Over3"}, 60, staff)
        session.actual_start = timezone.now() - timedelta(minutes=125)
        session.save(update_fields=["actual_start"])
        result = end_session(session.id, staff)
        s = result["session"]
        assert s.overage_minutes == 60
        assert s.overage_amount == Decimal("300.00")
        assert s.total_amount == Decimal("600.00")

    def test_overage_with_extension(self, unit, staff):
        """
        Start 60 min, extend 30, run 100 min total.
        Paid = 90, grace = 5 → 5 min overage × Rs.5 = Rs.25.
        """
        session = start_session(unit.id, {"guest_name": "ExtOverage"}, 60, staff)
        session = extend_session(session.id, 30, "cash", staff)
        session.actual_start = timezone.now() - timedelta(minutes=100)
        session.save(update_fields=["actual_start"])
        result = end_session(session.id, staff)
        s = result["session"]
        assert s.paid_duration_minutes == 90
        assert s.base_amount == Decimal("450.00")
        assert s.overage_minutes == 5, f"Expected 5, got {s.overage_minutes}"
        assert s.overage_amount == Decimal("25.00")
        assert s.total_amount == Decimal("475.00")

    def test_overage_with_different_rate(self, prop, staff):
        """Custom overage rate of Rs.8/min."""
        unit = _create_unit(prop, overage_rate=Decimal("8"))
        session = start_session(unit.id, {"guest_name": "DiffRate"}, 60, staff)
        session.actual_start = timezone.now() - timedelta(minutes=75)
        session.save(update_fields=["actual_start"])
        result = end_session(session.id, staff)
        assert result["session"].overage_minutes == 10
        assert result["session"].overage_amount == Decimal("80.00")

    def test_overage_with_zero_grace(self, prop, staff):
        """Grace = 0 means any second over is charged."""
        unit = _create_unit(prop, grace=0)
        session = start_session(unit.id, {"guest_name": "NoGrace"}, 60, staff)
        session.actual_start = timezone.now() - timedelta(minutes=65)
        session.save(update_fields=["actual_start"])
        result = end_session(session.id, staff)
        assert result["session"].overage_minutes == 5
        assert result["session"].overage_amount == Decimal("25.00")

    def test_overage_invoice_has_line_items(self, unit, staff):
        """Overage invoice should have both base and overage line items."""
        session = start_session(unit.id, {"guest_name": "OverageInv"}, 60, staff)
        session.actual_start = timezone.now() - timedelta(minutes=75)
        session.save(update_fields=["actual_start"])
        result = end_session(session.id, staff)
        invoice = result["invoice"]
        assert invoice.items.count() == 2
        descriptions = [item.description for item in invoice.items.all()]
        assert any("Overage" in d for d in descriptions)
        assert any("Timed Session" in d for d in descriptions)


# ═══════════════════════════════════════════════════════════════════════════════
# LIVE STATUS
# ═══════════════════════════════════════════════════════════════════════════════

class TestCalculateLiveStatus:
    """Verify live status calculations for active sessions."""

    def test_returns_correct_structure(self, unit, staff):
        session = start_session(unit.id, {"guest_name": "Live"}, 60, staff)
        live = calculate_live_status(session.id)
        assert live["session_id"] == session.id
        assert live["unit_name"] == "Test Unit"
        assert live["status"] == "active"
        assert live["remaining_minutes"] > 0
        assert live["estimated_overage_charge"] == Decimal("0.00")

    def test_reports_overage_when_past_paid_time(self, unit, staff):
        session = start_session(unit.id, {"guest_name": "LiveOver"}, 60, staff)
        session.actual_start = timezone.now() - timedelta(minutes=70)
        session.save(update_fields=["actual_start"])
        live = calculate_live_status(session.id)
        assert live["overage_minutes"] > 0
        assert live["estimated_overage_charge"] > 0
        assert live["estimated_total"] > Decimal("300.00")

    def test_shows_paused_status(self, unit, staff):
        session = start_session(unit.id, {"guest_name": "LivePause"}, 60, staff)
        pause_session(session.id, staff)
        live = calculate_live_status(session.id)
        assert live["paused"] is True
        assert live["status"] == "paused"


# ═══════════════════════════════════════════════════════════════════════════════
# END SESSION — Edge Cases
# ═══════════════════════════════════════════════════════════════════════════════

class TestEndSessionEdgeCases:
    """Edge cases: already ended, cancelled, paused session being ended."""

    def test_fails_for_already_ended(self, unit, staff):
        session = start_session(unit.id, {"guest_name": "AlreadyEnded"}, 60, staff)
        end_session(session.id, staff)
        with pytest.raises(ValueError, match="Cannot end"):
            end_session(session.id, staff)

    def test_fails_for_cancelled_session(self, unit, staff):
        session = start_session(unit.id, {"guest_name": "Cancelled"}, 60, staff)
        session.status = SessionStatus.CANCELLED
        session.save()
        with pytest.raises(ValueError, match="Cannot end"):
            end_session(session.id, staff)

    def test_can_end_paused_session(self, unit, staff):
        """A paused session can be ended directly."""
        session = start_session(unit.id, {"guest_name": "PauseEnd"}, 60, staff)
        pause_session(session.id, staff)
        result = end_session(session.id, staff)
        assert result["session"].status == SessionStatus.ENDED

    def test_zero_minute_paid(self, unit, staff):
        """Starting with 0 paid minutes should still work (edge case)."""
        session = start_session(unit.id, {"guest_name": "Zero"}, 60, staff)
        session.paid_duration_minutes = 0
        session.save()
        session.actual_start = timezone.now() - timedelta(minutes=10)
        session.save(update_fields=["actual_start"])
        result = end_session(session.id, staff)
        s = result["session"]
        assert s.overage_minutes == 5  # 10 - 0 - 5 grace
        assert s.status == SessionStatus.ENDED
