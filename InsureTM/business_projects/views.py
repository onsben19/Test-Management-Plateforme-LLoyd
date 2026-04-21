from rest_framework import viewsets, permissions, filters
from .models import BusinessProject
from .serializers import BusinessProjectSerializer

class BusinessProjectViewSet(viewsets.ModelViewSet):
    queryset = BusinessProject.objects.all().order_by('-created_at')
    serializer_class = BusinessProjectSerializer
    permission_classes = [permissions.IsAuthenticated]
    filter_backends = [filters.SearchFilter]
    search_fields = ['name', 'description']

    def get_queryset(self):
        # Optionnel: Filtrer par utilisateur si besoin, mais ici on veut tout le portfolio
        return super().get_queryset()
