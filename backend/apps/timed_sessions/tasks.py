"""
SIA HMS — Timed Sessions Celery Tasks
Periodic checks for expiring/overdue sessions with WebSocket alerts.
"""

import logging
from datetime import timedelta
from django.utils import timezone
from django.db import transaction
from celery import shared_task
from asgiref.sync import async_to_sync
from apps.tenants.realtime import get_channel_layer

from apps.timed_sessions.models import TimedSession, SessionStatus, SessionUnit, SessionUnitStatus
from apps.timed_sessions.service import end_session

logger = logging.getLogger(__name__)


def _broadcast(group_name, event_type, data):
    """Send a WebSocket broadcast to a channel group."""
    try:
        channel_layer = get_channel_layer()
        async_to_sync(channel_layer.group_send)(
            group_name,
            {"type": event_type, **data},
        )
    except Exception as e:
        logger.error(f"WebSocket broadcast failed: {e}")


@shared_task
def check_expiring_sessions():
    """
    Runs every 1 minute. Finds active sessions expiring within 5 minutes
    and broadcasts 'expiring_soon' alert via WebSocket if no warning sent recently.
    """
    now = timezone.now()
    five_min_later = now + timedelta(minutes=5)
    warning_cooldown = now - timedelta(minutes=2)

    expiring = TimedSession.objects.filter(
        status=SessionStatus.ACTIVE,
        actual_start__isnull=False,
        paid_duration_minutes__gt=0,
    ).select_related("unit")

    for session in expiring:
        expires_at = session.actual_start + timedelta(minutes=session.paid_duration_minutes)
        if expires_at <= five_min_later and expires_at > now:
            # Check if warning already sent recently
            if session.last_expiry_warning_sent and session.last_expiry_warning_sent > warning_cooldown:
                continue

            remaining = int((expires_at - now).total_seconds() / 60)
            session.last_expiry_warning_sent = now
            session.save(update_fields=["last_expiry_warning_sent"])

            # Broadcast per-unit channel
            _broadcast(
                f"sessions_public",
                "session_expiring",
                {
                    "unit_id": session.unit_id,
                    "unit_name": session.unit.unit_name,
                    "remaining_minutes": max(1, remaining),
                },
            )
            logger.info(
                f"Expiry warning: {session.unit.unit_name} — {max(1, remaining)} min remaining"
            )

    return expiring.count()


@shared_task
def auto_end_overdue_sessions():
    """
    Runs every 5 minutes. Auto-ends sessions that have exceeded
    their paid duration + grace + max_overage (default 30 min).
    """
    now = timezone.now()
    max_overage_minutes = 30  # configurable per-property in future

    overdue = TimedSession.objects.filter(
        status=SessionStatus.ACTIVE,
        actual_start__isnull=False,
        paid_duration_minutes__gt=0,
    ).select_related("unit__unit_type", "unit__property")

    ended_count = 0
    for session in overdue:
        expires_at = session.actual_start + timedelta(
            minutes=session.paid_duration_minutes
            + session.unit.unit_type.grace_period_minutes
            + max_overage_minutes
        )
        if now < expires_at:
            continue

        try:
            with transaction.atomic():
                result = end_session(session.id)
                invoice = result["invoice"]

                # Broadcast
                _broadcast(
                    f"sessions_public",
                    "session_ended",
                    {
                        "unit_id": session.unit_id,
                        "unit_name": session.unit.unit_name,
                        "total_amount": session.total_amount,
                    },
                )
                ended_count += 1
                logger.info(
                    f"Auto-ended overdue session {session.id} for {session.unit.unit_name}"
                )
        except Exception as e:
            logger.error(f"Failed to auto-end session {session.id}: {e}")
            raise

    return ended_count
