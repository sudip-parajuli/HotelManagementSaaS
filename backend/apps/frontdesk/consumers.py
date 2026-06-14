from channels.generic.websocket import JsonWebsocketConsumer
from asgiref.sync import sync_to_async, async_to_sync


class FrontDeskConsumer(JsonWebsocketConsumer):
    """
    WebSocket consumer for real-time front desk operation updates.
    """
    def connect(self):
        self.group_name = "frontdesk"
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

    def frontdesk_update(self, event):
        """
        Triggered when a group broadcast is sent.
        """
        self.send_json(event["data"])
