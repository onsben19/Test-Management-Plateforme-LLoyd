import os
import django
from django.core.mail import send_mail, get_connection
from django.conf import settings

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings')
django.setup()

def test_email():
    try:
        print("--- SMTP Configuration Check ---")
        print(f"Host: {settings.EMAIL_HOST}")
        print(f"Port: {settings.EMAIL_PORT}")
        print(f"User: {settings.EMAIL_HOST_USER}")
        
        # We manually create a connection to set a timeout
        # This prevents the script from hanging forever if Outlook doesn't respond
        connection = get_connection(
            host=settings.EMAIL_HOST,
            port=settings.EMAIL_PORT,
            username=settings.EMAIL_HOST_USER,
            password=settings.EMAIL_HOST_PASSWORD,
            use_tls=settings.EMAIL_USE_TLS,
            timeout=10, # 10 seconds timeout
        )

        print("\nAttempting to send...")
        
        send_mail(
            subject='Test SMTP Subject',
            message='This is a test email from the Django shell.',
            from_email=settings.EMAIL_HOST_USER,
            recipient_list=['ben.ons@esprit.tn'], # Fixed syntax
            fail_silently=False,
            connection=connection
        )
        print("✅ Email sent successfully!")

    except Exception as e:
        print(f"\n❌ Failed to send email.")
        print(f"Error details: {e}")

if __name__ == "__main__":
    test_email()