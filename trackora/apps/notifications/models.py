"""
Notification models for Trackora.
"""
import  uuid
from django.db import models
from django.conf import settings
from django.utils.translation import gettext_lazy as _


class NotificationManager(models.Manager):
    """Custom manager for Notification model"""

    def unread(self):
        """Get unread notifications"""
        return self.filter(is_read=False)

    def by_type(self, notification_type):
        """Get notifications by type"""
        return self.filter(notification_type=notification_type)

    def for_user(self, user):
        """Get notifications for a specific user"""
        return self.filter(recipient=user)


class Notification(models.Model):
    """
    Notification model for user notifications.
    """

    NOTIFICATION_TYPES = [
        ('task_assigned', _('Task Assigned')),
        ('task_due_soon', _('Task Due Soon')),
        ('task_overdue', _('Task Overdue')),
        ('sla_breach', _('SLA Breach')),
        ('task_approved', _('Task Approved')),
        ('task_rejected', _('Task Rejected')),
        ('task_completed', _('Task Completed')),
        ('task_closed', _('Task Closed')),
        ('comment_added', _('Comment Added')),
        ('attachment_added', _('Attachment Added')),
    ]

    PRIORITY_LEVELS = [
        ('low', _('Low')),
        ('medium', _('Medium')),
        ('high', _('High')),
        ('urgent', _('Urgent')),
    ]

    id = models.UUIDField(
        primary_key=True,
        default=uuid.uuid4,
        editable=False
    )
    recipient = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name='notifications',
        help_text=_('User who will receive this notification')
    )
    notification_type = models.CharField(
        max_length=50,
        choices=NOTIFICATION_TYPES,
        help_text=_('Type of notification')
    )
    title = models.CharField(
        max_length=200,
        help_text=_('Notification title')
    )
    message = models.TextField(
        help_text=_('Notification message content')
    )
    priority = models.CharField(
        max_length=20,
        choices=PRIORITY_LEVELS,
        default='medium',
        help_text=_('Notification priority level')
    )

    # Related objects (optional)
    task = models.ForeignKey(
        'tasks.Task',
        on_delete=models.CASCADE,
        null=True,
        blank=True,
        related_name='notifications',
        help_text=_('Related task if applicable')
    )
    comment = models.ForeignKey(
        'tasks.Comment',
        on_delete=models.CASCADE,
        null=True,
        blank=True,
        related_name='notifications',
        help_text=_('Related comment if applicable')
    )
    attachment = models.ForeignKey(
        'tasks.Attachment',
        on_delete=models.CASCADE,
        null=True,
        blank=True,
        related_name='notifications',
        help_text=_('Related attachment if applicable')
    )

    # Status fields
    is_read = models.BooleanField(
        default=False,
        help_text=_('Whether the notification has been read')
    )
    read_at = models.DateTimeField(
        null=True,
        blank=True,
        help_text=_('When the notification was read')
    )
    email_sent = models.BooleanField(
        default=False,
        help_text=_('Whether email notification was sent')
    )
    email_sent_at = models.DateTimeField(
        null=True,
        blank=True,
        help_text=_('When the email was sent')
    )

    # Timestamps
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    objects = NotificationManager()

    class Meta:
        verbose_name = _('notification')
        verbose_name_plural = _('notifications')
        db_table = 'notifications'
        ordering = ['-created_at']
        indexes = [
            models.Index(fields=['recipient', '-created_at']),
            models.Index(fields=['notification_type']),
            models.Index(fields=['priority']),
            models.Index(fields=['is_read']),
            models.Index(fields=['task']),
        ]

    def __str__(self):
        return f'{self.notification_type} for {self.recipient.email}: {self.title}'

    def mark_as_read(self):
        """Mark notification as read"""
        if not self.is_read:
            self.is_read = True
            self.read_at = models.functions.Now()
            self.save(update_fields=['is_read', 'read_at'])

    def mark_email_sent(self):
        """Mark that email was sent"""
        if not self.email_sent:
            self.email_sent = True
            self.email_sent_at = models.functions.Now()
            self.save(update_fields=['email_sent', 'email_sent_at'])


class NotificationPreference(models.Model):
    """
    User preferences for notifications.
    """

    EMAIL_FREQUENCIES = [
        ('immediate', _('Immediate')),
        ('daily', _('Daily Digest')),
        ('weekly', _('Weekly Digest')),
        ('never', _('Never')),
    ]

    user = models.OneToOneField(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name='notification_preferences',
        help_text=_('User these preferences belong to')
    )

    # Task-related notifications
    task_assigned = models.BooleanField(
        default=True,
        help_text=_('Notify when task is assigned')
    )
    task_due_soon = models.BooleanField(
        default=True,
        help_text=_('Notify when task is due soon (24 hours)')
    )
    task_overdue = models.BooleanField(
        default=True,
        help_text=_('Notify when task becomes overdue')
    )
    sla_breach = models.BooleanField(
        default=True,
        help_text=_('Notify when SLA is breached')
    )
    task_approved = models.BooleanField(
        default=True,
        help_text=_('Notify when task is approved')
    )
    task_rejected = models.BooleanField(
        default=True,
        help_text=_('Notify when task is rejected')
    )
    task_completed = models.BooleanField(
        default=True,
        help_text=_('Notify when task is completed')
    )
    task_closed = models.BooleanField(
        default=True,
        help_text=_('Notify when task is closed')
    )

    # Comment and attachment notifications
    comment_added = models.BooleanField(
        default=True,
        help_text=_('Notify when comment is added to task')
    )
    attachment_added = models.BooleanField(
        default=True,
        help_text=_('Notify when attachment is added to task')
    )

    # Email preferences
    email_frequency = models.CharField(
        max_length=20,
        choices=EMAIL_FREQUENCIES,
        default='immediate',
        help_text=_('How often to send email notifications')
    )

    # Timestamps
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        verbose_name = _('notification preference')
        verbose_name_plural = _('notification preferences')
        db_table = 'notification_preferences'

    def __str__(self):
        return f'Notification preferences for {self.user.email}'
