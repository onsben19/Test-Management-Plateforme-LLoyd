from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import AskAgentView, ConversationViewSet, ReformulateMessageView, CampaignTimelineGuardView

router = DefaultRouter()
router.register(r'conversations', ConversationViewSet, basename='conversation')

urlpatterns = [
    path('', include(router.urls)),
    path('ask/', AskAgentView.as_view(), name='ask-agent'),
    path('reformulate/', ReformulateMessageView.as_view(), name='reformulate-message'),
    path('timeline-guard/<int:campaign_id>/', CampaignTimelineGuardView.as_view(), name='timeline-guard'),
]
