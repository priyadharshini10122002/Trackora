"""
URL configuration for notifications API.
"""

from django.urls import path, include
from rest_framework.routers import DefaultRouter

from apps.notifications.api.views import NotificationViewSet, NotificationPreferenceViewSet

# Create the router
router = DefaultRouter()
router.register(r'notifications', NotificationViewSet, basename='notification')
router.register(r'notification-preferences', NotificationPreferenceViewSet, basename='notification-preference')

# URL patterns
urlpatterns = [
    path('', include(router.urls)),
]
