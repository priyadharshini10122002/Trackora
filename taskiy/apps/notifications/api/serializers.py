"""
API serializers for Notifications.
"""

from rest_framework import serializers
from django.utils import timezone

from apps.notifications.models import Notification, NotificationPreference


class NotificationSerializer(serializers.ModelSerializer):
    """
    Serializer for Notification model.
    """
    task_title = serializers.CharField(source='task.title', read_only=True)
    task_id = serializers.UUIDField(source='task.id', read_only=True)
    comment_content = serializers.CharField(source='comment.content', read_only=True)
    attachment_filename = serializers.CharField(source='attachment.filename', read_only=True)

    class Meta:
        model = Notification
        fields = [
            'id',
            'notification_type',
            'title',
            'message',
            'priority',
            'task',
            'task_id',
            'task_title',
            'comment',
            'comment_content',
            'attachment',
            'attachment_filename',
            'is_read',
            'read_at',
            'email_sent',
            'email_sent_at',
            'created_at',
        ]
        read_only_fields = [
            'id',
            'created_at',
            'updated_at',
            'read_at',
            'email_sent_at',
        ]


class NotificationListSerializer(serializers.ModelSerializer):
    """
    Compact serializer for notification listing.
    """
    task_title = serializers.CharField(source='task.title', read_only=True)

    class Meta:
        model = Notification
        fields = [
            'id',
            'notification_type',
            'title',
            'priority',
            'task_title',
            'is_read',
            'created_at',
        ]


class NotificationPreferenceSerializer(serializers.ModelSerializer):
    """
    Serializer for NotificationPreference model.
    """

    class Meta:
        model = NotificationPreference
        fields = [
            'user',
            'task_assigned',
            'task_due_soon',
            'task_overdue',
            'sla_breach',
            'task_approved',
            'task_rejected',
            'task_completed',
            'task_closed',
            'comment_added',
            'attachment_added',
            'email_frequency',
            'created_at',
            'updated_at',
        ]
        read_only_fields = [
            'user',
            'created_at',
            'updated_at',
        ]

    def create(self, validated_data):
        """Create preferences for the current user"""
        validated_data['user'] = self.context['request'].user
        return super().create(validated_data)


class MarkReadSerializer(serializers.Serializer):
    """
    Serializer for marking notifications as read.
    """
    notification_ids = serializers.ListField(
        child=serializers.UUIDField(),
        allow_empty=False,
        help_text="List of notification IDs to mark as read"
    )

    def validate_notification_ids(self, value):
        """Validate that notifications exist and belong to user"""
        request = self.context.get('request')
        if not request or not request.user:
            raise serializers.ValidationError("Authentication required.")

        existing_ids = set(
            Notification.objects.filter(
                recipient=request.user,
                id__in=value
            ).values_list('id', flat=True)
        )

        missing_ids = set(value) - existing_ids
        if missing_ids:
            raise serializers.ValidationError(
                f"Notifications not found: {list(missing_ids)}"
            )

        return value
