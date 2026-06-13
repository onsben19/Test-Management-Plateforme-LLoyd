from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import UserViewSet, LoginView, Verify2FAView, ForgotPasswordView, UserProfileView, ChangePasswordView

router = DefaultRouter()
router.register(r'users', UserViewSet)

urlpatterns = [
    path('login/', LoginView.as_view(), name='login'),
    path('verify-2fa/', Verify2FAView.as_view(), name='verify-2fa'),
    path('forgot-password/', ForgotPasswordView.as_view(), name='forgot-password'),
    path('profile/', UserProfileView.as_view(), name='user-profile'),
    path('change-password/', ChangePasswordView.as_view(), name='change-password'),
    path('', include(router.urls)),
]