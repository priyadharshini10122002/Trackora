"""
Celery tasks for Notifications.
"""

from celery import shared_task
from django.utils import timezone
from django.core.mail import send_mail
from django.conf import settings
from django.db.models import Q

from apps.notifications.models import Notification, NotificationPreference
from apps.users.models import User


@shared_task(bind=True, max_retries=3)
def send_daily_digest(self):
    """
    Send daily digest emails to users with unread notifications.
    Runs daily at 9 AM.
    """
    try:
        yesterday = timezone.now() - timezone.timedelta(days=1)

        # Get users with unread notifications from yesterday
        users_with_notifications = User.objects.filter(
            notifications__is_read=False,
            notifications__created_at__gte=yesterday
        ).distinct()

        digest_count = 0
        for user in users_with_notifications:
            # Get user's notification preferences
            try:
                preferences = user.notification_preferences
                if preferences.email_frequency == 'never':
                    continue
            except NotificationPreference.DoesNotExist:
                # Create default preferences if they don't exist
                preferences = NotificationPreference.objects.create(user=user)

            # Skip if user prefers immediate emails only
            if preferences.email_frequency == 'immediate':
                continue

            # Get unread notifications
            unread_notifications = Notification.objects.filter(
                recipient=user,
                is_read=False,
                created_at__gte=yesterday
            ).order_by('-created_at')[:10]  # Limit to 10 most recent

            if unread_notifications.exists():
                _send_digest_email(user, unread_notifications)
                digest_count += 1

        return f"Sent daily digest to {digest_count} users"

    except Exception as exc:
        self.retry(countdown=3600, exc=exc)  # Retry after 1 hour


def _send_digest_email(user, notifications):
    """Send daily digest email to user."""
    subject = f"Trackora Daily Digest - {timezone.now().date()}"

    # Build digest content
    digest_content = f"""
Hello {user.first_name or user.email},

Here's your daily digest of Trackora activity:

"""

    for notification in notifications:
        digest_content += f"""
• {notification.title}
  {notification.message}
  {notification.created_at.strftime('%H:%M')}
"""

    digest_content += f"""

Total unread notifications: {notifications.count()}

You can view all your notifications in the Trackora dashboard.

Best regards,
The Trackora Team
"""

    send_mail(
        subject=subject,
        message=digest_content,
        from_email=settings.DEFAULT_FROM_EMAIL,
        recipient_list=[user.email],
        fail_silently=False,
    )


@shared_task(bind=True, max_retries=3)
def send_immediate_notification(self, notification_id):
    """
    Send immediate email notification for high-priority items.
    """
    try:
        notification = Notification.objects.get(id=notification_id)

        # Check user preferences
        try:
            preferences = notification.recipient.notification_preferences
            if preferences.email_frequency == 'never':
                return f"Skipped email for {notification.recipient.email} (preference: never)"
        except NotificationPreference.DoesNotExist:
            # Create default preferences
            preferences = NotificationPreference.objects.create(
                user=notification.recipient
            )

        # Send email if preferences allow
        if preferences.email_frequency in ['immediate', 'daily']:
            subject = f"Trackora: {notification.title}"
            message = f"""
Hello {notification.recipient.first_name or notification.recipient.email},

{notification.message}

Priority: {notification.priority}
Time: {notification.created_at.strftime('%Y-%m-%d %H:%M')}

You can view this notification in your Trackora dashboard.

Best regards,
The Trackora Team
"""

            send_mail(
                subject=subject,
                message=message,
                from_email=settings.DEFAULT_FROM_EMAIL,
                recipient_list=[notification.recipient.email],
                fail_silently=False,
            )

            # Mark email as sent
            notification.mark_email_sent()

            return f"Sent immediate notification to {notification.recipient.email}"

    except Notification.DoesNotExist:
        return f"Notification {notification_id} not found"
    except Exception as exc:
        self.retry(countdown=300, exc=exc)  # Retry after 5 minutes


@shared_task(bind=True, max_retries=3)
def cleanup_old_notifications(self):
    """
    Clean up old read notifications.
    Runs weekly.
    """
    try:
        # Delete read notifications older than 90 days
        cutoff_date = timezone.now() - timezone.timedelta(days=90)

        deleted_count, _ = Notification.objects.filter(
            is_read=True,
            created_at__lt=cutoff_date
        ).delete()

        return f"Cleaned up {deleted_count} old notifications"

    except Exception as exc:
        self.retry(countdown=3600, exc=exc)  # Retry after 1 hour
