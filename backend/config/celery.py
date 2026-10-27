"""
SIA HMS — Celery Configuration
"""

import os
from celery import Celery
from celery.schedules import crontab

os.environ.setdefault("DJANGO_SETTINGS_MODULE", "config.settings.development")

app = Celery("sia_hms")
app.config_from_object("django.conf:settings", namespace="CELERY")
app.autodiscover_tasks()

# ─────────────────────────────
# Celery Beat Schedule (recurring tasks)
# ─────────────────────────────
# One tenant-aware, deduplicated runner. External messaging and subscription
# collection are deliberately not activated by an infrastructure deployment.
app.conf.beat_schedule = {
    "staywired-maintenance": {
        "task": "apps.tenants.tasks.run_maintenance",
        "schedule": crontab(minute="*"),
    },
}

app.conf.timezone = "Asia/Kathmandu"


@app.task(bind=True, ignore_result=True)
def debug_task(self):
    """Debug task to verify Celery is working."""
    print(f"Request: {self.request!r}")
