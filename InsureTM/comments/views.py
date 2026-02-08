from rest_framework import viewsets
from rest_framework.permissions import IsAuthenticated
from django.db.models import Q
from .models import Comment
from .serializers import CommentSerializer

class CommentViewSet(viewsets.ModelViewSet):
    queryset = Comment.objects.all()
    serializer_class = CommentSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        queryset = Comment.objects.all()
        search = self.request.query_params.get('search', None)

        if search:
            queryset = queryset.filter(Q(message__icontains=search) | Q(author__username__icontains=search))
            
        return queryset

    def perform_create(self, serializer):
        instance = serializer.save(author=self.request.user)
        
        # Notification Logic
        test_case = instance.test_case
        if test_case and test_case.campaign:
            recipient = test_case.campaign.imported_by
            if recipient and recipient != self.request.user:
                from notifications.models import Notification
                Notification.objects.create(
                    recipient=recipient,
                    title="Nouveau Commentaire",
                    message=f"{self.request.user.username} a commenté sur {test_case.test_case_ref}",
                    type='comment_posted',
                    related_campaign=test_case.campaign,
                    related_object_id=instance.id
                )
