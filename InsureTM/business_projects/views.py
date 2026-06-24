from rest_framework import viewsets, permissions, filters
from .health_cache import invalidate_bp_health
from .models import BusinessProject
from .serializers import BusinessProjectSerializer

class BusinessProjectViewSet(viewsets.ModelViewSet):
    queryset = BusinessProject.objects.select_related('created_by').prefetch_related('releases')
    serializer_class = BusinessProjectSerializer
    permission_classes = [permissions.IsAuthenticated]
    filter_backends = [filters.SearchFilter, filters.OrderingFilter]
    search_fields = ['name', 'description']
    ordering_fields = ['created_at']
    ordering = ['-created_at']

    def get_queryset(self):
        queryset = super().get_queryset()
        owner = self.request.query_params.get('owner')
        if owner and owner != 'ALL':
            queryset = queryset.filter(created_by__username=owner)
        return queryset

    def perform_update(self, serializer):
        instance = serializer.save()
        invalidate_bp_health(instance.id)
        if instance.status == 'TERMINÉ':
            instance.releases.update(status='COMPLETED')
