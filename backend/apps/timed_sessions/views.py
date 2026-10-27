"""
SIA HMS — Timed Sessions API Views
"""

from decimal import Decimal
from django.utils import timezone
from django.db.models import Sum, Count, Q
from django.db.models.functions import TruncDate

from rest_framework import viewsets, status
from rest_framework.views import APIView
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from asgiref.sync import async_to_sync
from apps.tenants.realtime import get_channel_layer

from apps.subscriptions.permissions import HasFeaturePermission
from apps.properties.models import Property
from apps.timed_sessions.models import (
    SessionUnitType, SessionUnit, SessionUnitStatus,
    TimedSession, SessionStatus,
)
from apps.timed_sessions.serializers import (
    SessionUnitTypeSerializer,
    SessionUnitSerializer,
    SessionUnitStatusSerializer,
    TimedSessionSerializer,
    StartSessionSerializer,
    ExtendSessionSerializer,
)
from apps.timed_sessions.service import (
    start_session,
    extend_session,
    pause_session,
    resume_session,
    end_session,
    calculate_live_status,
)


# ─── Permission ──────────────────────────────────────────────────────────────

class HasTimedSessionsFeature(HasFeaturePermission):
    feature_key = "timed_sessions"


# ─── Session Unit Types ──────────────────────────────────────────────────────

class SessionUnitTypeViewSet(viewsets.ModelViewSet):
    permission_classes = [IsAuthenticated, HasTimedSessionsFeature]
    serializer_class = SessionUnitTypeSerializer
    pagination_class = None

    def get_property(self):
        return Property.objects.first()

    def get_queryset(self):
        prop = self.get_property()
        if not prop:
            return SessionUnitType.objects.none()
        return SessionUnitType.objects.filter(property=prop)


# ─── Session Units ───────────────────────────────────────────────────────────

class SessionUnitViewSet(viewsets.ModelViewSet):
    permission_classes = [IsAuthenticated, HasTimedSessionsFeature]
    serializer_class = SessionUnitSerializer
    pagination_class = None

    def get_property(self):
        return Property.objects.first()

    def get_queryset(self):
        prop = self.get_property()
        if not prop:
            return SessionUnit.objects.none()
        qs = SessionUnit.objects.filter(
            property=prop, is_active=True
        ).select_related("unit_type")
        status_filter = self.request.query_params.get("status")
        if status_filter:
            qs = qs.filter(status=status_filter)
        unit_type = self.request.query_params.get("unit_type")
        if unit_type:
            qs = qs.filter(unit_type_id=unit_type)
        return qs

    @action(detail=True, methods=["get"])
    def status(self, request, pk=None):
        """Returns unit detail with active session live status."""
        unit = self.get_object()
        serializer = SessionUnitStatusSerializer({"unit": unit})
        return Response(serializer.data)


# ─── Timed Sessions ──────────────────────────────────────────────────────────

class TimedSessionViewSet(viewsets.ModelViewSet):
    permission_classes = [IsAuthenticated, HasTimedSessionsFeature]
    serializer_class = TimedSessionSerializer

    def get_property(self):
        return Property.objects.first()

    def get_queryset(self):
        prop = self.get_property()
        if not prop:
            return TimedSession.objects.none()
        qs = TimedSession.objects.filter(
            unit__property=prop
        ).select_related(
            "unit__unit_type", "guest", "pos_order", "invoice"
        ).prefetch_related("extensions")

        status_filter = self.request.query_params.get("status")
        if status_filter:
            qs = qs.filter(status=status_filter)

        unit = self.request.query_params.get("unit")
        if unit:
            qs = qs.filter(unit_id=unit)

        date_from = self.request.query_params.get("date_from")
        if date_from:
            qs = qs.filter(created_at__date__gte=date_from)

        date_to = self.request.query_params.get("date_to")
        if date_to:
            qs = qs.filter(created_at__date__lte=date_to)

        return qs.order_by("-created_at")

    @action(detail=True, methods=["post"])
    def extend(self, request, pk=None):
        serializer = ExtendSessionSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        try:
            session = extend_session(
                pk,
                serializer.validated_data["additional_minutes"],
                payment_method=serializer.validated_data.get("payment_method", ""),
                staff_user=request.user,
            )
            # Broadcast
            _broadcast_session_extended(session)
            return Response(TimedSessionSerializer(session).data)
        except ValueError as e:
            return Response({"error": str(e)}, status=status.HTTP_400_BAD_REQUEST)

    @action(detail=True, methods=["post"])
    def pause(self, request, pk=None):
        try:
            session = pause_session(pk, staff_user=request.user)
            _broadcast_unit_status(session.unit_id, SessionUnitStatus.OCCUPIED)
            return Response(TimedSessionSerializer(session).data)
        except ValueError as e:
            return Response({"error": str(e)}, status=status.HTTP_400_BAD_REQUEST)

    @action(detail=True, methods=["post"])
    def resume(self, request, pk=None):
        try:
            session = resume_session(pk, staff_user=request.user)
            _broadcast_unit_status(session.unit_id, SessionUnitStatus.OCCUPIED)
            return Response(TimedSessionSerializer(session).data)
        except ValueError as e:
            return Response({"error": str(e)}, status=status.HTTP_400_BAD_REQUEST)

    @action(detail=True, methods=["post"])
    def end(self, request, pk=None):
        try:
            result = end_session(pk, staff_user=request.user)
            _broadcast_session_ended(result["session"])
            return Response({
                "session": TimedSessionSerializer(result["session"]).data,
                "invoice_id": result["invoice"].id,
                "invoice_number": result["invoice"].invoice_number,
                "total_amount": str(result["session"].total_amount),
            })
        except ValueError as e:
            return Response({"error": str(e)}, status=status.HTTP_400_BAD_REQUEST)

    @action(detail=True, methods=["get"])
    def live(self, request, pk=None):
        try:
            data = calculate_live_status(pk)
            return Response(data)
        except TimedSession.DoesNotExist:
            return Response({"error": "Session not found"}, status=status.HTTP_404_NOT_FOUND)


# ─── Start Session ───────────────────────────────────────────────────────────

class StartSessionView(APIView):
    permission_classes = [IsAuthenticated, HasTimedSessionsFeature]

    def post(self, request):
        serializer = StartSessionSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        try:
            session = start_session(
                unit_id=serializer.validated_data["unit_id"],
                guest_info={
                    "guest_id": serializer.validated_data.get("guest_id"),
                    "guest_name": serializer.validated_data.get("guest_name", ""),
                    "guest_phone": serializer.validated_data.get("guest_phone", ""),
                },
                paid_minutes=serializer.validated_data["paid_minutes"],
                created_by=request.user,
            )
            _broadcast_session_started(session)
            return Response(
                TimedSessionSerializer(session).data,
                status=status.HTTP_201_CREATED,
            )
        except ValueError as e:
            return Response({"error": str(e)}, status=status.HTTP_400_BAD_REQUEST)


# ─── Reports ─────────────────────────────────────────────────────────────────

class SessionReportsView(APIView):
    permission_classes = [IsAuthenticated, HasTimedSessionsFeature]

    def get_property(self):
        return Property.objects.first()

    def get(self, request, report):
        prop = self.get_property()
        if not prop:
            return Response({"error": "No property configured"}, status=400)
        today = timezone.localdate()

        if report == "daily":
            sessions_today = TimedSession.objects.filter(
                unit__property=prop,
                created_at__date=today,
            )
            return Response({
                "date": today,
                "total_sessions": sessions_today.count(),
                "active_now": sessions_today.filter(status=SessionStatus.ACTIVE).count(),
                "revenue": float(
                    sessions_today.aggregate(s=Sum("total_amount"))["s"] or 0
                ),
                "avg_duration_minutes": float(
                    sessions_today.aggregate(a=Sum("total_active_minutes"))["a"] or 0
                ) / max(sessions_today.count(), 1),
            })

        if report == "units":
            units = SessionUnit.objects.filter(property=prop, is_active=True)
            total = units.count()
            occupied = units.filter(status=SessionUnitStatus.OCCUPIED).count()
            # Utilisation: sessions per unit in last 30 days
            thirty_days_ago = today - __import__("datetime").timedelta(days=30)
            return Response({
                "total_units": total,
                "occupied_now": occupied,
                "available": units.filter(status=SessionUnitStatus.AVAILABLE).count(),
                "maintenance": units.filter(status=SessionUnitStatus.MAINTENANCE).count(),
            })

        return Response({"error": "Unknown report"}, status=400)


# ─── WebSocket Broadcast Helpers ─────────────────────────────────────────────

def _broadcast(group_name, event_type, data):
    try:
        channel_layer = get_channel_layer()
        async_to_sync(channel_layer.group_send)(
            group_name,
            {"type": event_type, **data},
        )
    except Exception:
        pass


def _broadcast_session_started(session):
    _broadcast(
        f"sessions_public",
        "session_started",
        {
            "unit_id": session.unit_id,
            "unit_name": session.unit.unit_name,
            "guest_name": session.guest_name,
            "paid_minutes": session.paid_duration_minutes,
        },
    )


def _broadcast_session_extended(session):
    from apps.timed_sessions.service import calculate_live_status
    live = calculate_live_status(session.id)
    _broadcast(
        f"sessions_public",
        "session_extended",
        {
            "unit_id": session.unit_id,
            "unit_name": session.unit.unit_name,
            "new_remaining_minutes": live["remaining_minutes"],
        },
    )


def _broadcast_session_ended(session):
    _broadcast(
        f"sessions_public",
        "session_ended",
        {
            "unit_id": session.unit_id,
            "unit_name": session.unit.unit_name,
            "total_amount": float(session.total_amount),
        },
    )


def _broadcast_unit_status(unit_id, new_status):
    unit = SessionUnit.objects.filter(id=unit_id).first()
    if unit:
        _broadcast(
            f"sessions_public",
            "unit_status_changed",
            {"unit_id": unit_id, "new_status": new_status},
        )
