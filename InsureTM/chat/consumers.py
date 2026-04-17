import json
from channels.generic.websocket import AsyncWebsocketConsumer
from channels.db import database_sync_to_async

class ChatConsumer(AsyncWebsocketConsumer):
    async def connect(self):
        self.user = self.scope["user"]
        if not self.user.is_authenticated:
            await self.close()
            return

        self.room_group_name = "global_chat"

        # Join global room
        await self.channel_layer.group_add(
            self.room_group_name,
            self.channel_name
        )

        await self.accept()

        # Notify others about presence
        await self.channel_layer.group_send(
            self.room_group_name,
            {
                "type": "presence_update",
                "user_id": self.user.id,
                "username": self.user.username,
                "status": "online"
            }
        )

    async def disconnect(self, close_code):
        # Leave room group
        await self.channel_layer.group_discard(
            self.room_group_name,
            self.channel_name
        )

        # Notify others about disconnect
        await self.channel_layer.group_send(
            self.room_group_name,
            {
                "type": "presence_update",
                "user_id": self.user.id,
                "username": self.user.username,
                "status": "offline"
            }
        )

    # Receive message from WebSocket
    async def receive(self, text_data):
        text_data_json = json.json.loads(text_data)
        message_type = text_data_json.get("type")

        if message_type == "typing":
            # Broadcast typing indicator to the conversation group
            conv_id = text_data_json.get("conversation_id")
            await self.channel_layer.group_send(
                f"chat_{conv_id}",
                {
                    "type": "chat_typing",
                    "user_id": self.user.id,
                    "username": self.user.username,
                    "is_typing": text_data_json.get("is_typing", False)
                }
            )

    # Receive message from room group
    async def chat_message(self, event):
        await self.send(text_data=json.dumps(event))

    async def presence_update(self, event):
        await self.send(text_data=json.dumps(event))

    async def chat_typing(self, event):
        await self.send(text_data=json.dumps(event))

    async def chat_mention(self, event):
        await self.send(text_data=json.dumps(event))
