import json
from channels.generic.websocket import AsyncWebsocketConsumer

class CampaignLiveConsumer(AsyncWebsocketConsumer):
    async def connect(self):
        self.campaign_id = self.scope['url_route']['kwargs']['campaign_id']
        self.group_name = f'campaign_{self.campaign_id}'

        # Join group
        await self.channel_layer.group_add(
            self.group_name,
            self.channel_name
        )

        await self.accept()

    async def disconnect(self, close_code):
        # Leave group
        await self.channel_layer.group_discard(
            self.group_name,
            self.channel_name
        )

    # Receive message from room group
    async def live_event(self, event):
        # Send message to WebSocket
        await self.send(text_data=json.dumps(event['payload']))
