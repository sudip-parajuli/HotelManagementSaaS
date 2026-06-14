"""
SIA HMS — ASGI Configuration
Handles both HTTP (Django) and WebSocket (Django Channels) connections.
"""

import os
import django
from django.core.asgi import get_asgi_application

os.environ.setdefault("DJANGO_SETTINGS_MODULE", "config.settings.development")
django.setup()

from channels.routing import ProtocolTypeRouter, URLRouter  # noqa: E402
from channels.auth import AuthMiddlewareStack  # noqa: E402
from channels.security.websocket import AllowedHostsOriginValidator  # noqa: E402

from apps.pos.routing import websocket_urlpatterns as pos_ws_patterns  # noqa: E402
from apps.housekeeping.routing import websocket_urlpatterns as hk_ws_patterns  # noqa: E402
from apps.frontdesk.routing import websocket_urlpatterns as fd_ws_patterns  # noqa: E402

# Combine all WebSocket URL patterns
all_websocket_patterns = (
    pos_ws_patterns
    + hk_ws_patterns
    + fd_ws_patterns
)

application = ProtocolTypeRouter(
    {
        "http": get_asgi_application(),
        "websocket": AllowedHostsOriginValidator(
            AuthMiddlewareStack(
                URLRouter(all_websocket_patterns)
            )
        ),
    }
)
