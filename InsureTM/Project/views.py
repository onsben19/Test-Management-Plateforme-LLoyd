# Project/views.py
from rest_framework import viewsets
from django.db.models import Q
from .models import Project
from .serializers import ProjectSerializer

class ProjectViewSet(viewsets.ModelViewSet):
    serializer_class = ProjectSerializer

    def get_queryset(self):
        queryset = Project.objects.all()
        search = self.request.query_params.get('search', None)
        status = self.request.query_params.get('status', None)

        if search:
            queryset = queryset.filter(Q(name__icontains=search) | Q(description__icontains=search))
        
        if status and status != 'ALL':
            queryset = queryset.filter(status=status)
            
        return queryset

    def perform_create(self, serializer):
        serializer.save(created_by=self.request.user)