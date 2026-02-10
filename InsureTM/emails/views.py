from rest_framework import viewsets, permissions, status
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.parsers import MultiPartParser, FormParser
from django.db.models import Q
from django.core.mail import EmailMessage
from django.conf import settings
from .models import Email
from .serializers import EmailSerializer
import mimetypes

class EmailViewSet(viewsets.ModelViewSet):
    serializer_class = EmailSerializer
    permission_classes = [permissions.IsAuthenticated]
    parser_classes = [MultiPartParser, FormParser]

    def create(self, request, *args, **kwargs):
        # Handle multiple recipients
        recipients = request.data.getlist('recipients')
        if not recipients:
            # Fallback if single 'recipient' is sent
            recipient = request.data.get('recipient')
            if recipient:
                recipients = [recipient]
            else:
                return Response({"recipient": ["This field is required."]}, status=status.HTTP_400_BAD_REQUEST)

        # Get attachment from request
        attachment_file = request.FILES.get('attachment')
        
        created_emails = []
        for recipient_id in recipients:
            # specific data for this recipient
            data = request.data.copy()
            data['recipient'] = recipient_id

            if attachment_file:
                # Reset file pointer for each iteration
                attachment_file.seek(0)
            
            serializer = self.get_serializer(data=data)
            serializer.is_valid(raise_exception=True)
            self.perform_create(serializer)
            created_emails.append(serializer.data)
            
        return Response(created_emails, status=status.HTTP_201_CREATED)

    def get_queryset(self):
        user = self.request.user
        return Email.objects.filter(Q(sender=user) | Q(recipient=user))

    def perform_create(self, serializer):
        # Allow specifying recipient by ID
        # The sender is always the current user
        recipient = serializer.validated_data.get('recipient')
        
        instance = serializer.save(sender=self.request.user)

        # Send actual email via SMTP
        try:
            email = EmailMessage(
                subject=instance.subject,
                body=instance.body,
                from_email=settings.DEFAULT_FROM_EMAIL,
                to=[recipient.email],
            )
            if instance.attachment:
                # Attach the file
                # Ensure we read from the beginning
                instance.attachment.open('rb')
                
                # Guess mime type
                content_type, encoding = mimetypes.guess_type(instance.attachment.name)
                if content_type is None:
                    content_type = 'application/octet-stream'
                    
                email.attach(instance.attachment.name, instance.attachment.read(), content_type)
                instance.attachment.close()
            
            email.send(fail_silently=False)
        except Exception as e:
            print(f"Failed to send email via SMTP: {e}")
            # We don't fail the request if SMTP fails, but we log it.

        # Create In-App Notification for recipient
        from notifications.models import Notification
        Notification.objects.create(
            recipient=recipient,
            title="Nouveau Message",
            message=f"Vous avez reçu un message de {self.request.user.username}: {instance.subject}",
            type='email_received',
            related_object_id=instance.id
        )

    @action(detail=True, methods=['post'])
    def mark_read(self, request, pk=None):
        email = self.get_object()
        if request.user == email.recipient:
            email.is_read = True
            email.save()
            return Response({'status': 'email marked as read'})
        return Response({'status': 'unauthorized'}, status=status.HTTP_403_FORBIDDEN)
