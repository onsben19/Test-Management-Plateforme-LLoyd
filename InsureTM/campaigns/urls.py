from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import CampaignViewSet, TaskAssignmentViewSet

# On crée le router
router = DefaultRouter()
router.register(r'', CampaignViewSet, basename='campaign')
router.register(r'tasks', TaskAssignmentViewSet, basename='taskassignment')

urlpatterns = [
    path('', include(router.urls)),
]