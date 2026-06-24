import json
from channels.generic.websocket import AsyncWebsocketConsumer


class ChatConsumer(AsyncWebsocketConsumer):
    async def connect(self):
        self.user = self.scope['user']
        self.room_group_name = None

        if not self.user.is_authenticated:
            await self.close()
            return

        self.room_group_name = 'global_chat'
        await self.channel_layer.group_add(self.room_group_name, self.channel_name)
        await self.accept()

        await self.channel_layer.group_send(
            self.room_group_name,
            {
                'type': 'presence_update',
                'user_id': self.user.id,
                'username': self.user.username,
                'status': 'online',
            },
        )

    async def disconnect(self, close_code):
        if self.room_group_name:
            await self.channel_layer.group_discard(self.room_group_name, self.channel_name)
            await self.channel_layer.group_send(
                self.room_group_name,
                {
                    'type': 'presence_update',
                    'user_id': self.user.id,
                    'username': self.user.username,
                    'status': 'offline',
                },
            )

    async def receive(self, text_data):
        text_data_json = json.loads(text_data)
        message_type = text_data_json.get('type')

        if message_type == 'typing':
            conv_id = text_data_json.get('conversation_id')
            await self.channel_layer.group_send(
                'global_chat',
                {
                    'type': 'chat_typing',
                    'conversation_id': str(conv_id),
                    'user_id': self.user.id,
                    'username': self.user.username,
                    'is_typing': text_data_json.get('is_typing', False),
                },
            )

    async def chat_message(self, event):
        await self.send(text_data=json.dumps(event))

    async def chat_message_update(self, event):
        await self.send(text_data=json.dumps(event))

    async def chat_message_delete(self, event):
        await self.send(text_data=json.dumps(event))

    async def chat_read(self, event):
        await self.send(text_data=json.dumps(event))

    async def presence_update(self, event):
        await self.send(text_data=json.dumps(event))

    async def chat_typing(self, event):
        await self.send(text_data=json.dumps(event))

    async def chat_mention(self, event):
        await self.send(text_data=json.dumps(event))
