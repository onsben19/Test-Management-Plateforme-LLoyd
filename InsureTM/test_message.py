import os
import django
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'InsureTM.settings')
django.setup()

from chat.serializers import MessageSerializer

data = {'conversation': 1, 'text': 'Hello'}
serializer = MessageSerializer(data=data)
if not serializer.is_valid():
    print(serializer.errors)
else:
    print("Valid!")
