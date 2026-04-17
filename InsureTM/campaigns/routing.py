from django.urls import re_path
from . import consumers

websocket_urlpatterns = [
    re_path(r'ws/campaigns/(?P<campaign_id>\d+)/live/$', consumers.CampaignLiveConsumer.as_asgi()),
]
