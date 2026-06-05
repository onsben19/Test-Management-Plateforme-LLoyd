import json
from channels.generic.websocket import AsyncWebsocketConsumer

class TestCaseLogsConsumer(AsyncWebsocketConsumer):
    async def connect(self):
        self.test_case_id = self.scope['url_route']['kwargs']['test_case_id']
        self.group_name = f'testcase_logs_{self.test_case_id}'

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

    # Receive message from group
    async def log_message(self, event):
        # Send message to WebSocket
        await self.send(text_data=json.dumps({
            "type": "log",
            "message": event['message']
        }))
