from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import AskAgentView, ConversationViewSet

router = DefaultRouter()
router.register(r'conversations', ConversationViewSet, basename='conversation')

urlpatterns = [
    path('', include(router.urls)),
    path('ask/', AskAgentView.as_view(), name='ask-agent'),
]
