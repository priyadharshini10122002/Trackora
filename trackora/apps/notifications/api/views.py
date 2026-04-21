"""
API views for Notifications.
"""

from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from django_filters.rest_framework import DjangoFilterBackend
from rest_framework.filters import SearchFilter, OrderingFilter
from django.utils import timezone

from apps.notifications.models import Notification, NotificationPreference
from apps.notifications.api.serializers import (
    NotificationSerializer,
    NotificationListSerializer,
    NotificationPreferenceSerializer,
    MarkReadSerializer,
)


class NotificationViewSet(viewsets.ReadOnlyModelViewSet):
    """
    ViewSet for Notification management.
    """
    queryset = Notification.objects.all()
    filter_backends = [DjangoFilterBackend, SearchFilter, OrderingFilter]
    filterset_fields = ['notification_type', 'priority', 'is_read', 'task']
    search_fields = ['title', 'message']
    ordering_fields = ['created_at', 'priority', 'is_read']
    ordering = ['-created_at']

    def get_serializer_class(self):
        if self.action == 'list':
            return NotificationListSerializer
        return NotificationSerializer

    def get_permissions(self):
        """All notification actions require authentication"""
        return [IsAuthenticated()]

    def get_queryset(self):
        """Filter notifications for current user"""
        return Notification.objects.filter(recipient=self.request.user)

    @action(detail=False, methods=['post'], url_path='mark-read')
    def mark_read(self, request):
        """Mark multiple notifications as read"""
        serializer = MarkReadSerializer(data=request.data, context={'request': request})
        if serializer.is_valid():
            notification_ids = serializer.validated_data['notification_ids']
            updated_count = Notification.objects.filter(
                recipient=request.user,
                id__in=notification_ids,
                is_read=False
            ).update(is_read=True, read_at=timezone.now())

            return Response({
                'message': f'Marked {updated_count} notifications as read.',
                'updated_count': updated_count
            })

        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

    @action(detail=False, methods=['get'], url_path='unread-count')
    def unread_count(self, request):
        """Get count of unread notifications"""
        count = self.get_queryset().filter(is_read=False).count()
        return Response({'unread_count': count})

    @action(detail=False, methods=['post'], url_path='mark-all-read')
    def mark_all_read(self, request):
        """Mark all user's notifications as read"""
        updated_count = self.get_queryset().filter(is_read=False).update(
            is_read=True,
            read_at=timezone.now()
        )
        return Response({
            'message': f'Marked {updated_count} notifications as read.',
            'updated_count': updated_count
        })

    @action(detail=True, methods=['post'], url_path='mark-read')
    def mark_single_read(self, request, pk=None):
        """Mark a single notification as read"""
        notification = self.get_object()
        if not notification.is_read:
            notification.mark_as_read()
            return Response({'message': 'Notification marked as read.'})
        return Response({'message': 'Notification was already read.'})


class NotificationPreferenceViewSet(viewsets.ModelViewSet):
    """
    ViewSet for NotificationPreference management.
    """
    serializer_class = NotificationPreferenceSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        """Users can only see their own preferences"""
        return NotificationPreference.objects.filter(user=self.request.user)

    def get_object(self):
        """Get or create preferences for current user"""
        obj, created = NotificationPreference.objects.get_or_create(
            user=self.request.user
        )
        return obj

    def list(self, request, *args, **kwargs):
        """Override list to return single preference object"""
        instance = self.get_object()
        serializer = self.get_serializer(instance)
        return Response(serializer.data)

    def create(self, request, *args, **kwargs):
        """Create preferences if they don't exist"""
        if NotificationPreference.objects.filter(user=request.user).exists():
            return Response(
                {'error': 'Preferences already exist. Use PUT to update.'},
                status=status.HTTP_400_BAD_REQUEST
            )
        return super().create(request, *args, **kwargs)

    def perform_create(self, serializer):
        """Set user on creation"""
        serializer.save(user=self.request.user)
