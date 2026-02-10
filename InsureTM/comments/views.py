from rest_framework import viewsets
from rest_framework.permissions import IsAuthenticated
from rest_framework.parsers import MultiPartParser, FormParser
from django.db.models import Q
from .models import Comment
from .serializers import CommentSerializer

class CommentViewSet(viewsets.ModelViewSet):
    queryset = Comment.objects.all()
    serializer_class = CommentSerializer
    permission_classes = [IsAuthenticated]
    parser_classes = [MultiPartParser, FormParser]

    def get_queryset(self):
        queryset = Comment.objects.all()
        search = self.request.query_params.get('search', None)
        test_case_id = self.request.query_params.get('test_case', None)

        if search:
            queryset = queryset.filter(Q(message__icontains=search) | Q(author__username__icontains=search))
            
        if test_case_id:
            queryset = queryset.filter(test_case_id=test_case_id)
            
        return queryset

    def perform_create(self, serializer):
        instance = serializer.save(author=self.request.user)
        
        # Notification Logic
        test_case = instance.test_case
        if test_case and test_case.campaign:
            recipients = set()
            
            # Add Campaign Manager
            if test_case.campaign.imported_by:
                recipients.add(test_case.campaign.imported_by)
                
            # Add Assigned Tester
            if test_case.tester:
                recipients.add(test_case.tester)
            
            # Remove the sender from recipients (don't notify yourself)
            if self.request.user in recipients:
                recipients.remove(self.request.user)

            from notifications.models import Notification
            for recipient in recipients:
                Notification.objects.create(
                    recipient=recipient,
                    title="Nouveau Commentaire",
                    message=f"{self.request.user.username} a commenté sur {test_case.test_case_ref}",
                    type='comment_posted',
                    related_campaign=test_case.campaign,
                    related_object_id=test_case.id
                )
