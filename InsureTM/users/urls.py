from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import UserViewSet, LoginView, Verify2FAView, ForgotPasswordView

router = DefaultRouter()
router.register(r'users', UserViewSet)

urlpatterns = [
    path('login/', LoginView.as_view(), name='login'),
    path('verify-2fa/', Verify2FAView.as_view(), name='verify-2fa'),
    path('forgot-password/', ForgotPasswordView.as_view(), name='forgot-password'),
    path('', include(router.urls)),
]