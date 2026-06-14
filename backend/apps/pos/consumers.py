from channels.generic.websocket import JsonWebsocketConsumer
from asgiref.sync import async_to_sync


class KDSConsumer(JsonWebsocketConsumer):
    """
    WebSocket consumer for real-time kitchen order tickets (KOT) updates.
    Routes to groups based on station (hot_kitchen, cold_prep, bar, etc.).
    """
    def connect(self):
        self.station = self.scope["url_route"]["kwargs"].get("station", "all")
        self.group_name = f"kds_{self.station}"
        
        async_to_sync(self.channel_layer.group_add)(
            self.group_name,
            self.channel_name
        )
        self.accept()

    def disconnect(self, close_code):
        async_to_sync(self.channel_layer.group_discard)(
            self.group_name,
            self.channel_name
        )

    def receive_json(self, content, **kwargs):
        pass

    def kds_order_update(self, event):
        """
        Broadcasting new tickets or item changes.
        """
        self.send_json(event["data"])
