"""
URL configuration for users API.
"""

from django.urls import path, include
from rest_framework.routers import DefaultRouter
from rest_framework_simplejwt.views import TokenRefreshView

from apps.users.api.views import (
    UserViewSet,
    RoleViewSet,
    UserRoleViewSet,
    CustomTokenObtainPairView,
    register_user,
    logout_user,
)

# Create the router
router = DefaultRouter()
router.register(r'users', UserViewSet, basename='user')
router.register(r'roles', RoleViewSet, basename='role')
router.register(r'user-roles', UserRoleViewSet, basename='user-role')

# URL patterns
urlpatterns = [
    # Authentication endpoints
    path('auth/register/', register_user, name='register'),
    path('auth/login/', CustomTokenObtainPairView.as_view(), name='token_obtain_pair'),
    path('auth/refresh/', TokenRefreshView.as_view(), name='token_refresh'),
    path('auth/logout/', logout_user, name='logout'),

    # API routes
    path('', include(router.urls)),
]
