from django.contrib import admin
from django.urls import path, include
from rest_framework_simplejwt.views import TokenObtainPairView, TokenRefreshView
from rest_framework_simplejwt.views import TokenBlacklistView
urlpatterns = [
path('admin/', admin.site.urls), 

path('api/login/', TokenObtainPairView.as_view(), name='token_obtain_pair'),
path('api/token/refresh/', TokenRefreshView.as_view(), name='token_refresh'),
path('api/logout/', TokenBlacklistView.as_view(), name='token_blacklist'),
    path('api/', include('users.urls')), 
    path('api/projects/', include('Project.urls')),
    path('api/campaigns/', include('campaigns.urls')),
    path('api/testcases/', include('testCases.urls')),
    path('api/anomalies/', include('anomalies.urls')),
    path('api/comments/', include('comments.urls')),
    path('api/notifications/', include('notifications.urls')),
    path('api/emails/', include('emails.urls')),
    path('api/analytics/', include('analytics.urls')),
   ]

from django.conf import settings
from django.conf.urls.static import static

if settings.DEBUG:
    urlpatterns += static(settings.MEDIA_URL, document_root=settings.MEDIA_ROOT)