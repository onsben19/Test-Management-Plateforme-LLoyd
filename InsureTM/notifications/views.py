from rest_framework import viewsets, permissions
from rest_framework.decorators import action
from rest_framework.response import Response
from .models import Notification
from .serializers import NotificationSerializer

NOTIFICATION_LIMIT = 50


class NotificationViewSet(viewsets.ReadOnlyModelViewSet):
    serializer_class = NotificationSerializer
    permission_classes = [permissions.IsAuthenticated]
    pagination_class = None

    def _base_queryset(self):
        return (Notification.objects
                .filter(recipient=self.request.user)
                .only('id', 'title', 'message', 'is_read', 'created_at', 'type',
                      'related_campaign_id', 'related_object_id')
                .order_by('-created_at'))

    def get_queryset(self):
        return self._base_queryset()[:NOTIFICATION_LIMIT]

    @action(detail=True, methods=['post'])
    def mark_read(self, request, pk=None):
        notification = self._base_queryset().filter(pk=pk).first()
        if not notification:
            return Response({'detail': 'Not found.'}, status=404)
        notification.is_read = True
        notification.save(update_fields=['is_read'])
        return Response({'status': 'notification marked as read'})

    @action(detail=False, methods=['post'])
    def mark_all_read(self, request):
        updated = Notification.objects.filter(
            recipient=request.user,
            is_read=False,
        ).update(is_read=True)
        return Response({'status': 'all notifications marked as read', 'updated': updated})
