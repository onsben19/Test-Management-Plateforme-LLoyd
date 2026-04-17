from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import (
    AskAgentView, 
    ConversationViewSet, 
    ReformulateMessageView, 
    CampaignTimelineGuardView,
    ReleaseReadinessView,
    CampaignClosureReportView,
    DashboardBriefView,
    CatchupPlanView,
    ApplyRecommendationActionView,
    HistoricalReleasesView,
    HistoricalTestersView,
    HistoricalModulesView
)

router = DefaultRouter()
router.register(r'conversations', ConversationViewSet, basename='conversation')

urlpatterns = [
    path('', include(router.urls)),
    path('ask/', AskAgentView.as_view(), name='ask-agent'),
    path('reformulate/', ReformulateMessageView.as_view(), name='reformulate-message'),
    path('timeline-guard/<int:campaign_id>/', CampaignTimelineGuardView.as_view(), name='timeline-guard'),
    path('readiness-score/<int:campaign_id>/', ReleaseReadinessView.as_view(), name='readiness-score'),
    path('readiness-score/project/<int:project_id>/', ReleaseReadinessView.as_view(), name='readiness-score-project'),
    path('closure-report/<int:campaign_id>/', CampaignClosureReportView.as_view(), name='closure-report'),
    path('dashboard-brief/', DashboardBriefView.as_view(), name='dashboard-brief'),
    path('catchup-plan/<int:campaign_id>/', CatchupPlanView.as_view(), name='catchup-plan'),
    path('apply-recommendation/', ApplyRecommendationActionView.as_view(), name='apply-recommendation'),
    path('releases/', HistoricalReleasesView.as_view(), name='historical-releases'),
    path('testers/', HistoricalTestersView.as_view(), name='historical-testers'),
    path('modules/', HistoricalModulesView.as_view(), name='historical-modules'),
]
