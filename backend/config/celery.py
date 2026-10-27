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
app.conf.beat_schedule = {
    # Analytics: aggregate daily metrics every night at 23:59
    "aggregate-daily-metrics": {
        "task": "apps.analytics.tasks.aggregate_daily_metrics",
        "schedule": crontab(hour=23, minute=59),
    },
    # Inventory: check low stock daily at 8am
    "check-low-stock": {
        "task": "apps.inventory.tasks.check_low_stock_alert",
        "schedule": crontab(hour=8, minute=0),
    },
    # CRM: birthday/anniversary greetings at 9am
    "send-birthday-greetings": {
        "task": "apps.crm.tasks.send_birthday_anniversary_sms",
        "schedule": crontab(hour=9, minute=0),
    },
    # CRM: winback campaign check daily at 10am
    "winback-campaign": {
        "task": "apps.crm.tasks.send_winback_campaign",
        "schedule": crontab(hour=10, minute=0),
    },
    # Subscriptions: renewal reminders daily at 9am
    "subscription-renewal-reminders": {
        "task": "apps.subscriptions.tasks.send_renewal_reminders",
        "schedule": crontab(hour=9, minute=0),
    },
    # Subscriptions: suspend past-due tenants daily at midnight
    "suspend-past-due-tenants": {
        "task": "apps.subscriptions.tasks.suspend_overdue_tenants",
        "schedule": crontab(hour=0, minute=5),
    },
    # Subscriptions: generate monthly invoices on the 1st at 6am (legacy)
    "generate-monthly-invoices": {
        "task": "apps.subscriptions.tasks.generate_monthly_subscription_invoices",
        "schedule": crontab(hour=6, minute=0, day_of_month=1),
    },
    # Subscriptions: generate module-based invoices on the 1st at 6:30am
    "generate-module-based-invoices": {
        "task": "apps.subscriptions.tasks.generate_module_based_invoices",
        "schedule": crontab(hour=6, minute=30, day_of_month=1),
    },
    # Timed Sessions: check expiring sessions every 1 minute
    "check-expiring-sessions": {
        "task": "apps.timed_sessions.tasks.check_expiring_sessions",
        "schedule": crontab(minute="*"),
    },
    # Timed Sessions: auto-end overdue sessions every 5 minutes
    "auto-end-overdue-sessions": {
        "task": "apps.timed_sessions.tasks.auto_end_overdue_sessions",
        "schedule": crontab(minute="*/5"),
    },
}

app.conf.timezone = "Asia/Kathmandu"


@app.task(bind=True, ignore_result=True)
def debug_task(self):
    """Debug task to verify Celery is working."""
    print(f"Request: {self.request!r}")
