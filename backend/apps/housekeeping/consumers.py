from channels.generic.websocket import JsonWebsocketConsumer
from asgiref.sync import async_to_sync


class HousekeepingConsumer(JsonWebsocketConsumer):
    """
    WebSocket consumer for real-time room cleaning and task assignment updates.
    """
    def connect(self):
        self.group_name = "housekeeping"
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

    def housekeeping_update(self, event):
        """
        Broadcasting clean task alerts.
        """
        self.send_json(event["data"])
