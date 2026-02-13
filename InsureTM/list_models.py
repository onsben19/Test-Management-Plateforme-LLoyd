import os
from google import genai
import django
from django.conf import settings

# Setup Django to access settings
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings')
django.setup()

api_key = settings.GOOGLE_API_KEY
if not api_key:
    print("No GOOGLE_API_KEY found in settings.")
    exit(1)

print(f"Using API Key: {api_key[:5]}...")

try:
    client = genai.Client(api_key=api_key)
    print("Listing available models (New SDK)...")
    # Pager object, needs iteration
    for m in client.models.list():
        # Adjust filter logic as needed based on new SDK attributes
        # Usually checking if it supports generation
        print(f"- {m.name}")
except Exception as e:
    print(f"Error listing models: {e}")

