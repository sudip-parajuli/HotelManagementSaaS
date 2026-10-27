"""Bounded authenticated live feed and an authenticated, idempotent cloud tick."""
import hmac
import time
from datetime import timedelta
from django.conf import settings
from django.db import connection
from django.http import JsonResponse
from django.utils import timezone
from django_tenants.utils import schema_context
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated
from .models import RealtimeEvent, ScheduledRun, Client


@api_view(["GET"])
@permission_classes([IsAuthenticated])
def events(request):
    # Resolve tenant through the same JWT/domain middleware as ordinary API calls.
    schema = request.tenant.schema_name
    channel = request.GET.get("channel", "")
    if channel == "housekeeping":
        group = channel
        roles = {"SUPER_ADMIN", "PROPERTY_MANAGER", "HOUSEKEEPING", "FRONT_DESK"}
    elif channel == "sessions":
        group = "sessions_public"
        roles = {"SUPER_ADMIN", "PROPERTY_MANAGER", "FRONT_DESK", "RESTAURANT_STAFF"}
    elif channel.startswith("kds/") and channel[4:] in {"hot_kitchen", "cold_prep", "bar", "pastry", "all"}:
        group = "kds_" + channel[4:]
        roles = {"SUPER_ADMIN", "PROPERTY_MANAGER", "RESTAURANT_STAFF"}
    else:
        return JsonResponse({"error": "Unknown channel."}, status=400)
    if request.user.role not in roles or schema == "public":
        return JsonResponse({"error": "Workspace access required."}, status=403)
    try:
        cursor = max(0, int(request.GET.get("cursor", "0")))
    except ValueError:
        return JsonResponse({"error": "Invalid cursor."}, status=400)
    with schema_context("public"):
        query = RealtimeEvent.objects.filter(tenant_schema=schema)
        query = query.filter(channel__startswith="kds_") if channel == "kds/all" else query.filter(channel=group)
        if "cursor" not in request.GET:
            latest = query.order_by("-id").values_list("id", flat=True).first() or 0
            return JsonResponse({"cursor": latest, "events": [], "resync": True})
        rows = list(query.filter(id__gt=cursor).order_by("id").values("id", "payload")[:100])
    return JsonResponse({"cursor": rows[-1]["id"] if rows else cursor, "events": [r["payload"] for r in rows]})


def tick(request):
    expected = getattr(settings, "STAYWIRED_CRON_SECRET", "")
    supplied = request.headers.get("Authorization", "")
    if not expected or not hmac.compare_digest(supplied, "Bearer " + expected):
        return JsonResponse({"error": "Unauthorized."}, status=401)
    if request.method != "POST":
        return JsonResponse({"error": "POST required."}, status=405)
    return run_maintenance()


def run_maintenance():
    from apps.timed_sessions.tasks import check_expiring_sessions, auto_end_overdue_sessions
    from apps.analytics.tasks import aggregate_daily_metrics
    now = timezone.localtime()
    # Lease the whole runner with a transaction advisory lock. Every job records
    # its unique minute/day slot. A crashed job is marked failed, never silently
    # repeated if it could have produced an invoice.
    results = []
    with schema_context("public"):
        from django.db import transaction
        with transaction.atomic():
            with connection.cursor() as cursor:
                cursor.execute("SELECT pg_try_advisory_xact_lock(78218420)")
                if not cursor.fetchone()[0]:
                    return JsonResponse({"status": "busy"})
            started = time.monotonic()
            clients = list(Client.objects.filter(is_active=True).exclude(schema_name="public").values_list("schema_name", flat=True))
            for schema in clients:
                jobs = [("session-warning", now.strftime("%Y-%m-%dT%H:%M"), check_expiring_sessions)]
                if now.minute % 5 == 0:
                    jobs.append(("session-overdue", now.strftime("%Y-%m-%dT%H:%M"), auto_end_overdue_sessions))
                if now.hour >= 1:
                    jobs.append(("daily-metrics", now.strftime("%Y-%m-%d"), aggregate_daily_metrics))
                for job, slot, task in jobs:
                    if time.monotonic() - started > 40:
                        return JsonResponse({"status": "partial", "jobs": results})
                    run, created = ScheduledRun.objects.get_or_create(job=job, tenant_schema=schema, slot=slot)
                    if not created:
                        continue
                    try:
                        # Savepoint isolates a failed tenant task from the runner.
                        with transaction.atomic(), schema_context(schema):
                            task.run()
                        run.status = "success"
                    except Exception as exc:
                        run.status = "failed"
                        run.error = type(exc).__name__  # Never log SQL, secrets or guest details.
                    run.finished_at = timezone.now()
                    run.save(update_fields=["status", "error", "finished_at"])
                    results.append({"job": job, "status": run.status})
            RealtimeEvent.objects.filter(created_at__lt=timezone.now()-timedelta(days=1)).delete()
            ScheduledRun.objects.filter(started_at__lt=timezone.now()-timedelta(days=7)).delete()
    return JsonResponse({"status": "ok", "jobs": results})
