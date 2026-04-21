from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import BusinessProjectViewSet

router = DefaultRouter()
router.register(r'', BusinessProjectViewSet, basename='businessproject')

urlpatterns = [
    path('', include(router.urls)),
]
