import logging

from django.contrib.auth import get_user_model
from django.db.models import Q
from rest_framework import viewsets
from rest_framework.permissions import IsAuthenticated
from rest_framework.parsers import MultiPartParser, FormParser, JSONParser

from notifications.models import Notification
from utils.email_service import send_comment_posted_email
from .models import Comment
from .serializers import CommentSerializer

logger = logging.getLogger(__name__)


class CommentViewSet(viewsets.ModelViewSet):
    queryset = Comment.objects.all()
    serializer_class = CommentSerializer
    permission_classes = [IsAuthenticated]
    parser_classes = [MultiPartParser, FormParser, JSONParser]

    def get_queryset(self):
        queryset = Comment.objects.all()
        search = self.request.query_params.get('search')
        test_case_id = self.request.query_params.get('test_case')
        recipient_id = self.request.query_params.get('recipient')
        chat_with_id = self.request.query_params.get('chat_with')

        if chat_with_id:
            queryset = queryset.filter(
                (Q(author_id=self.request.user.id) & Q(recipient_id=chat_with_id)) |
                (Q(author_id=chat_with_id) & Q(recipient_id=self.request.user.id))
            ).filter(test_case__isnull=True)

        if search:
            queryset = queryset.filter(
                Q(message__icontains=search) | Q(author__username__icontains=search)
            )

        if test_case_id:
            queryset = queryset.filter(test_case_id=test_case_id)
            
        if recipient_id:
            queryset = queryset.filter(recipient_id=recipient_id)

        return queryset.order_by('created_at')

    def perform_create(self, serializer):
        instance = serializer.save(author=self.request.user)
        
        # Handle Direct Messages Notifications
        if instance.recipient:
            Notification.objects.create(
                recipient=instance.recipient,
                title="Nouveau message direct",
                message=f"{self.request.user.username} vous a envoyé un message.",
                type='comment_posted', # Reuse type or add new one
            )
            return

        # Handle TestCase Comment Notifications
        test_case = instance.test_case
        if not (test_case and test_case.campaign):
            return

        recipients = set()
        if test_case.campaign.imported_by:
            recipients.add(test_case.campaign.imported_by)
        if test_case.tester:
            recipients.add(test_case.tester)
        recipients.discard(self.request.user)

        for recipient in recipients:
            Notification.objects.create(
                recipient=recipient,
                title="Nouveau Commentaire",
                message=f"{self.request.user.username} a commenté sur {test_case.test_case_ref}",
                type='comment_posted',
                related_campaign=test_case.campaign,
                related_object_id=test_case.id,
            )
            # Send SMTP email
            if recipient.email:
                try:
                    send_comment_posted_email(recipient, self.request.user, instance, test_case)
                except Exception as e:
                    logger.error(f"Failed to send email: {e}")
