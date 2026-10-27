"""Shared, tenant-scoped events for serverless functions; Channels for containers."""
from asgiref.sync import sync_to_async
from django.conf import settings
from django.db import connection, transaction
from django.core.serializers.json import DjangoJSONEncoder
from django_tenants.utils import schema_context
import json


def get_channel_layer():
    if getattr(settings, "STAYWIRED_RUNTIME", "") != "vercel":
        from channels.layers import get_channel_layer as original
        return original()
    return DatabaseChannelLayer(connection.schema_name)


class DatabaseChannelLayer:
    def __init__(self, schema):
        self.schema = schema

    async def group_send(self, group, event):
        # sync_to_async returns to the initiating Django thread when invoked via
        # async_to_sync, preserving its transaction/on_commit behavior.
        await sync_to_async(self.enqueue, thread_sensitive=True)(group, event)

    def enqueue(self, group, event):
        schema = self.schema
        payload = json.loads(json.dumps(event.get("data", event), cls=DjangoJSONEncoder))
        def write():
            from .models import RealtimeEvent
            with schema_context("public"):
                RealtimeEvent.objects.create(tenant_schema=schema, channel=group, payload=payload)
        transaction.on_commit(write)
