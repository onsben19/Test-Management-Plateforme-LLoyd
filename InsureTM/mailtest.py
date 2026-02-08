import os
import environ
import django
from django.core.mail import send_mail

# Initialisation de l'environnement Django
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings')
django.setup()

def envoyer_test():
    try:
        print("Tentative d'envoi via Outlook...")
        send_mail(
            'Test Orchestration iSureTM',
            'test test.',
            'benmessaoudons@outlook.com',
            ['ben.ons@esprit.tn'], 
            fail_silently=False,
        )
        print("✅ Succès ! Vérifie ta boîte de réception (et tes spams).")
    except Exception as e:
        print(f"❌ Échec de l'envoi : {e}")

if __name__ == "__main__":
    envoyer_test()