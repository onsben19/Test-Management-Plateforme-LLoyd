import os
import django
from django.core.asgi import get_asgi_application

# 1. Start Django
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings')
django_asgi_app = get_asgi_application()

# 2. Import Channels components AFTER get_asgi_application()
from channels.routing import ProtocolTypeRouter, URLRouter
from channels.auth import AuthMiddlewareStack
from chat.middleware import TokenAuthMiddleware
import campaigns.routing
import chat.routing

application = ProtocolTypeRouter({
    "http": django_asgi_app,
    "websocket": TokenAuthMiddleware(
        AuthMiddlewareStack(
            URLRouter(
                campaigns.routing.websocket_urlpatterns +
                chat.routing.websocket_urlpatterns
            )
        )
    ),
})
