from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import AnomalieViewSet

router = DefaultRouter()
router.register(r'', AnomalieViewSet, basename='anomalie')

urlpatterns = [
    path('', include(router.urls)),
]