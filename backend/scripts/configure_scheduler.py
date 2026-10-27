"""Run through supabase_manage.py shell; never embed credentials in cron SQL."""
import os
from django.db import connection, transaction
from django_tenants.utils import schema_context

secret = os.environ.get("STAYWIRED_CRON_SECRET", "")
if len(secret) < 32:
    raise RuntimeError("Configure STAYWIRED_CRON_SECRET before installing the scheduler.")
with schema_context("public"), transaction.atomic(), connection.cursor() as cursor:
    cursor.execute("CREATE EXTENSION IF NOT EXISTS pg_cron WITH SCHEMA pg_catalog")
    cursor.execute("CREATE EXTENSION IF NOT EXISTS pg_net WITH SCHEMA extensions")
    cursor.execute("SELECT id FROM vault.secrets WHERE name = %s", ["staywired_scheduler_secret"])
    row = cursor.fetchone()
    if row:
        cursor.execute("SELECT vault.update_secret(%s, %s)", [row[0], secret])
    else:
        cursor.execute("SELECT vault.create_secret(%s, %s)", [secret, "staywired_scheduler_secret"])
    command = """SELECT net.http_post(
        url := 'https://staywired-api.vercel.app/api/operations/tick/',
        headers := jsonb_build_object('Content-Type', 'application/json',
            'Authorization', 'Bearer ' || (SELECT decrypted_secret FROM vault.decrypted_secrets WHERE name = 'staywired_scheduler_secret')),
        body := '{}'::jsonb,
        timeout_milliseconds := 50000
    );"""
    cursor.execute("SELECT cron.schedule(%s, %s, %s)", ["staywired-maintenance", "* * * * *", command])
    job = cursor.fetchone()[0]
    # Extension-internal request queues must not be browser API surfaces.
    cursor.execute("REVOKE ALL ON SCHEMA net FROM anon, authenticated")
    cursor.execute("REVOKE ALL ON ALL TABLES IN SCHEMA net FROM anon, authenticated")
    cursor.execute("SELECT jobname, schedule, active FROM cron.job WHERE jobid = %s", [job])
    print("Scheduler configured:", cursor.fetchone())
