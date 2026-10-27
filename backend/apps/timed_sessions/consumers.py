"""
SIA HMS — Timed Sessions WebSocket Consumer
Broadcasts real-time session events to staff dashboards.
"""

from channels.generic.websocket import JsonWebsocketConsumer
from asgiref.sync import async_to_sync


class SessionConsumer(JsonWebsocketConsumer):
    """
    WebSocket consumer for live timed session updates.
    Channel group: sessions_{tenant_schema}
    """

    def connect(self):
        self.tenant_schema = self.scope["url_route"]["kwargs"].get("tenant_schema", "public")
        self.group_name = f"sessions_{self.tenant_schema}"

        async_to_sync(self.channel_layer.group_add)(
            self.group_name,
            self.channel_name,
        )
        self.accept()

    def disconnect(self, close_code):
        async_to_sync(self.channel_layer.group_discard)(
            self.group_name,
            self.channel_name,
        )

    def receive_json(self, content, **kwargs):
        pass

    # ─── Broadcast handlers ──────────────────────────────────────────────

    def session_started(self, event):
        self.send_json({
            "type": "session_started",
            "unit_id": event["unit_id"],
            "unit_name": event["unit_name"],
            "guest_name": event["guest_name"],
            "paid_minutes": event["paid_minutes"],
        })

    def session_expiring(self, event):
        self.send_json({
            "type": "session_expiring",
            "unit_id": event["unit_id"],
            "unit_name": event["unit_name"],
            "remaining_minutes": event["remaining_minutes"],
        })

    def session_extended(self, event):
        self.send_json({
            "type": "session_extended",
            "unit_id": event["unit_id"],
            "unit_name": event["unit_name"],
            "new_remaining_minutes": event["new_remaining_minutes"],
        })

    def session_ended(self, event):
        self.send_json({
            "type": "session_ended",
            "unit_id": event["unit_id"],
            "unit_name": event["unit_name"],
            "total_amount": str(event["total_amount"]),
        })

    def unit_status_changed(self, event):
        self.send_json({
            "type": "unit_status_changed",
            "unit_id": event["unit_id"],
            "new_status": event["new_status"],
        })
