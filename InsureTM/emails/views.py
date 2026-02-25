import logging
import mimetypes

from django.conf import settings
from django.core.mail import EmailMessage
from django.db.models import Q
from rest_framework import viewsets, permissions, status
from rest_framework.decorators import action
from rest_framework.parsers import MultiPartParser, FormParser
from rest_framework.response import Response

from notifications.models import Notification
from .models import Email
from .serializers import EmailSerializer

logger = logging.getLogger(__name__)


class EmailViewSet(viewsets.ModelViewSet):
    serializer_class = EmailSerializer
    permission_classes = [permissions.IsAuthenticated]
    parser_classes = [MultiPartParser, FormParser]

    def get_queryset(self):
        user = self.request.user
        return Email.objects.filter(Q(sender=user) | Q(recipient=user))

    def create(self, request, *args, **kwargs):
        recipients = request.data.getlist('recipients') or (
            [request.data.get('recipient')] if request.data.get('recipient') else []
        )
        if not recipients:
            return Response({"recipient": ["This field is required."]}, status=status.HTTP_400_BAD_REQUEST)

        attachment_file = request.FILES.get('attachment')
        created_emails = []

        for recipient_id in recipients:
            data = request.data.copy()
            data['recipient'] = recipient_id

            if attachment_file:
                attachment_file.seek(0)

            serializer = self.get_serializer(data=data)
            serializer.is_valid(raise_exception=True)
            self.perform_create(serializer)
            created_emails.append(serializer.data)

        return Response(created_emails, status=status.HTTP_201_CREATED)

    def perform_create(self, serializer):
        recipient = serializer.validated_data.get('recipient')
        instance = serializer.save(sender=self.request.user)

        self._send_smtp_email(instance, recipient)

        Notification.objects.create(
            recipient=recipient,
            title="Nouveau Message",
            message=f"Vous avez reçu un message de {self.request.user.username} : {instance.subject}",
            type='email_received',
            related_object_id=instance.id,
        )

    def _send_smtp_email(self, instance, recipient):
        """Send the email via SMTP. Logs failures without raising to avoid breaking the request."""
        try:
            email = EmailMessage(
                subject=instance.subject,
                body=instance.body,
                from_email=settings.DEFAULT_FROM_EMAIL,
                to=[recipient.email],
            )
            if instance.attachment:
                instance.attachment.open('rb')
                content_type, _ = mimetypes.guess_type(instance.attachment.name)
                email.attach(instance.attachment.name, instance.attachment.read(), content_type or 'application/octet-stream')
                instance.attachment.close()
            email.send(fail_silently=False)
        except Exception:
            logger.exception("Failed to send email via SMTP for instance %s", instance.id)

    @action(detail=True, methods=['post'])
    def mark_read(self, request, pk=None):
        email = self.get_object()
        if request.user != email.recipient:
            return Response({'status': 'unauthorized'}, status=status.HTTP_403_FORBIDDEN)
        email.is_read = True
        email.save()
        return Response({'status': 'email marked as read'})
