"""The container scheduler uses the same tenant-aware runner as cloud cron."""
import json
from celery import shared_task

@shared_task
def run_maintenance():
    from .operations import run_maintenance as run
    return json.loads(run().content)
