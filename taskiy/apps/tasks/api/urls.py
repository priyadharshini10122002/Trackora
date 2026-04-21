"""
URL configuration for tasks API.
"""

from django.urls import path, include
from rest_framework.routers import DefaultRouter

from apps.tasks.api.views import TaskViewSet, CommentViewSet, AttachmentViewSet

# Create the main router
router = DefaultRouter()
router.register(r'tasks', TaskViewSet, basename='task')
router.register(r'comments', CommentViewSet, basename='comment')
router.register(r'attachments', AttachmentViewSet, basename='attachment')

# URL patterns
urlpatterns = [
    # Main API routes
    path('', include(router.urls)),
]

# Note: For nested routes (comments and attachments under specific tasks),
# we would ideally use drf-nested-routers, but for now using flat structure.
# To enable nested routes, install: pip install drf-nested-routers
# Then uncomment the nested router code above and comment out the flat registration.
