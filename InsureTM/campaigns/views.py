from rest_framework import viewsets
from .models import Campaign, TaskAssignment
from .serializers import CampaignSerializer, TaskAssignmentSerializer
from rest_framework.permissions import IsAuthenticated
from rest_framework.parsers import MultiPartParser, FormParser # Import des parsers

from django.db.models import Q

from django.utils import timezone

class CampaignViewSet(viewsets.ModelViewSet):
    queryset = Campaign.objects.all()

    def get_queryset(self):
        queryset = Campaign.objects.all()
        user = self.request.user
        
        # Filtre pour les Testeurs : ne voir que les campagnes publiées (date passée ou nulle)
        if hasattr(user, 'role') and user.role == 'TESTER':
            queryset = queryset.filter(
                Q(scheduled_at__lte=timezone.now()) | Q(scheduled_at__isnull=True)
            )

        project_id = self.request.query_params.get('project')
        search = self.request.query_params.get('search', None)

        if project_id:
            queryset = queryset.filter(project_id=project_id)
        
        if search:
            queryset = queryset.filter(Q(title__icontains=search) | Q(description__icontains=search))
            
        return queryset
    serializer_class = CampaignSerializer
    permission_classes = [IsAuthenticated]
    
    def perform_create(self, serializer):
        serializer.save(imported_by=self.request.user)

    # Ajoute ceci pour permettre l'upload de fichiers via Postman/React
    parser_classes = (MultiPartParser, FormParser)

class TaskAssignmentViewSet(viewsets.ModelViewSet):
    queryset = TaskAssignment.objects.all()
    serializer_class = TaskAssignmentSerializer
    permission_classes = [IsAuthenticated]