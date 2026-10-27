"""
SIA HMS — Timed Sessions Business Logic
Core service functions for session lifecycle management.
"""

from decimal import Decimal
from datetime import timedelta
from django.utils import timezone
from django.db import transaction
from django.db.models import Sum

from apps.timed_sessions.models import (
    SessionUnit,
    SessionUnitStatus,
    SessionUnitType,
    TimedSession,
    SessionStatus,
    SessionExtension,
    PricingModel,
)


# ─── Helpers ─────────────────────────────────────────────────────────────────

def _get_overage_rate(unit_type: SessionUnitType) -> Decimal:
    """Return the per-minute overage rate for a unit type."""
    if unit_type.overage_rate is not None:
        return unit_type.overage_rate
    hourly = unit_type.rate
    if hourly and hourly > 0:
        return hourly / Decimal("60")
    return Decimal("0")


def _get_rate_per_minute(unit_type: SessionUnitType) -> Decimal:
    """Return the effective per-minute rate for a unit type."""
    if unit_type.pricing_model == PricingModel.PER_MINUTE:
        return unit_type.rate
    if unit_type.pricing_model == PricingModel.PER_HOUR:
        return unit_type.rate / Decimal("60")
    return Decimal("0")


# ─── Start Session ───────────────────────────────────────────────────────────

def start_session(unit_id, guest_info, paid_minutes, created_by):
    """
    Start a new timed session on a unit.
    - guest_info: dict with keys guest_id (optional), guest_name, guest_phone
    - paid_minutes: int — how many minutes the guest paid for upfront
    - created_by: User instance
    Returns the created TimedSession.
    """
    unit = SessionUnit.objects.select_related("unit_type").get(id=unit_id)

    if unit.status != SessionUnitStatus.AVAILABLE:
        raise ValueError(f"Unit '{unit.unit_name}' is not available (status: {unit.status})")

    unit_type = unit.unit_type
    price = _calculate_base_price(unit_type, paid_minutes)

    with transaction.atomic():
        session = TimedSession.objects.create(
            unit=unit,
            guest_id=guest_info.get("guest_id"),
            guest_name=guest_info.get("guest_name", ""),
            guest_phone=guest_info.get("guest_phone", ""),
            status=SessionStatus.ACTIVE,
            actual_start=timezone.now(),
            paid_duration_minutes=paid_minutes,
            base_amount=price,
            total_amount=price,
            created_by=created_by,
        )

        unit.status = SessionUnitStatus.OCCUPIED
        unit.save(update_fields=["status"])

    return session


def _calculate_base_price(unit_type: SessionUnitType, minutes: int) -> Decimal:
    """Calculate the base price for a given number of minutes."""
    if unit_type.pricing_model == PricingModel.FLAT_RATE:
        return unit_type.rate
    if unit_type.pricing_model == PricingModel.PER_DAY:
        days = max(1, (minutes + 1439) // 1440)  # ceil division
        return unit_type.rate * days
    per_min = _get_rate_per_minute(unit_type)
    return per_min * minutes


# ─── Extend Session ──────────────────────────────────────────────────────────

def extend_session(session_id, additional_minutes, payment_method="", staff_user=None):
    """
    Extend a session by adding more paid minutes.
    Returns updated TimedSession.
    """
    session = TimedSession.objects.select_related("unit__unit_type").get(id=session_id)

    if session.status not in (SessionStatus.ACTIVE, SessionStatus.PAUSED):
        raise ValueError(f"Cannot extend session in status '{session.status}'")

    unit_type = session.unit.unit_type
    added_amount = _calculate_base_price(unit_type, additional_minutes)

    with transaction.atomic():
        session.paid_duration_minutes += additional_minutes
        session.base_amount += added_amount
        session.total_amount += added_amount
        session.save(update_fields=["paid_duration_minutes", "base_amount", "total_amount"])

        SessionExtension.objects.create(
            session=session,
            extended_by_minutes=additional_minutes,
            additional_amount=added_amount,
            extended_by=staff_user,
            payment_method=payment_method,
        )

    return session


# ─── Pause / Resume ──────────────────────────────────────────────────────────

def pause_session(session_id, staff_user=None):
    """Pause an active session (e.g., customer break)."""
    session = TimedSession.objects.get(id=session_id)

    if session.status != SessionStatus.ACTIVE:
        raise ValueError(f"Cannot pause session in status '{session.status}'")

    session.status = SessionStatus.PAUSED
    session.paused_at = timezone.now()
    session.save(update_fields=["status", "paused_at"])
    return session


def resume_session(session_id, staff_user=None):
    """Resume a paused session."""
    session = TimedSession.objects.get(id=session_id)

    if session.status != SessionStatus.PAUSED:
        raise ValueError(f"Cannot resume session in status '{session.status}'")

    now = timezone.now()
    paused_duration = (now - session.paused_at).total_seconds() / 60
    session.total_paused_minutes += int(paused_duration)
    session.paused_at = None
    session.status = SessionStatus.ACTIVE
    session.save(update_fields=["total_paused_minutes", "paused_at", "status"])
    return session


# ─── End Session ─────────────────────────────────────────────────────────────

from apps.billing.models import Invoice, InvoiceItem, InvoiceItemType, InvoiceType
from decimal import Decimal as D


def end_session(session_id, staff_user=None):
    """
    End a session, calculate overage, generate invoice, mark unit as cleaning.
    Returns dict with {'session': session, 'invoice': invoice}.
    """
    session = TimedSession.objects.select_related(
        "unit__unit_type", "unit__property"
    ).get(id=session_id)

    if session.status not in (SessionStatus.ACTIVE, SessionStatus.PAUSED):
        raise ValueError(f"Cannot end session in status '{session.status}'")

    now = timezone.now()
    unit_type = session.unit.unit_type
    prop = session.unit.property

    # Calculate time
    start = session.actual_start
    elapsed = (now - start).total_seconds() / 60
    total_active = int(elapsed) - session.total_paused_minutes
    session.total_active_minutes = max(0, total_active)
    session.actual_end = now

    # Calculate overage
    overage_rate = _get_overage_rate(unit_type)
    grace = unit_type.grace_period_minutes
    overage_minutes = max(0, session.total_active_minutes - session.paid_duration_minutes - grace)
    session.overage_minutes = overage_minutes
    session.overage_amount = overage_rate * overage_minutes

    # Total
    session.total_amount = session.base_amount + session.overage_amount
    session.status = SessionStatus.ENDED

    with transaction.atomic():
        unit = session.unit
        unit.status = SessionUnitStatus.CLEANING
        unit.save(update_fields=["status"])

        session.save(update_fields=[
            "total_active_minutes", "actual_end", "overage_minutes",
            "overage_amount", "total_amount", "status",
        ])

        # Generate Invoice
        invoice = Invoice.objects.create(
            invoice_type=InvoiceType.RESTAURANT,
            walk_in_guest_name=session.guest_name,
            walk_in_guest_phone=session.guest_phone,
            subtotal=session.total_amount,
            service_charge_rate=prop.service_charge_rate if prop.service_charge_applicable else D("0"),
            total_amount=session.total_amount,
            status="unpaid",
        )

        InvoiceItem.objects.create(
            invoice=invoice,
            description=f"Timed Session: {unit.unit_name} ({unit_type.type_name}) — {session.paid_duration_minutes} min paid",
            quantity=1,
            unit_price=session.base_amount,
            amount=session.base_amount,
            item_type=InvoiceItemType.EXTRA_CHARGE,
        )

        if session.overage_amount > 0:
            InvoiceItem.objects.create(
                invoice=invoice,
                description=f"Overage: {session.overage_minutes} min at Rs.{overage_rate:.2f}/min",
                quantity=1,
                unit_price=session.overage_amount,
                amount=session.overage_amount,
                item_type=InvoiceItemType.EXTRA_CHARGE,
            )

        session.invoice = invoice
        session.save(update_fields=["invoice"])

    return {"session": session, "invoice": invoice}


# ─── Live Status ─────────────────────────────────────────────────────────────

def calculate_live_status(session_id):
    """
    Returns a real-time snapshot of session status for the live display.
    """
    session = TimedSession.objects.select_related("unit__unit_type", "pos_order").get(id=session_id)
    unit_type = session.unit.unit_type
    now = timezone.now()
    start = session.actual_start or now

    elapsed = (now - start).total_seconds() / 60
    total_active = int(elapsed) - session.total_paused_minutes
    remaining_minutes = max(0, session.paid_duration_minutes - total_active)
    overage_min = max(0, total_active - session.paid_duration_minutes)

    overage_rate = _get_overage_rate(unit_type)
    grace = unit_type.grace_period_minutes
    chargeable_overage = max(0, overage_min - grace)
    estimated_overage = overage_rate * chargeable_overage

    pos_total = D("0")
    if session.pos_order:
        pos_total = session.pos_order.total_amount

    return {
        "session_id": session.id,
        "unit_id": session.unit_id,
        "unit_name": session.unit.unit_name,
        "status": session.status,
        "elapsed_minutes": total_active,
        "remaining_minutes": remaining_minutes,
        "overage_minutes": overage_min,
        "estimated_overage_charge": estimated_overage,
        "pos_charges_total": pos_total,
        "estimated_total": session.base_amount + estimated_overage + pos_total,
        "paused": session.status == SessionStatus.PAUSED,
    }
