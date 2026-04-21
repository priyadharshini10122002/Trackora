"""
Celery tasks for users app.
"""

from datetime import timedelta

from celery import shared_task
from django.utils import timezone
from rest_framework_simplejwt.token_blacklist.models import OutstandingToken


@shared_task(bind=True, max_retries=2)
def cleanup_old_tokens(self):
    """
    Remove expired/old outstanding JWT records to keep token tables small.
    """
    try:
        cutoff = timezone.now() - timedelta(days=30)
        deleted_count, _ = OutstandingToken.objects.filter(expires_at__lt=cutoff).delete()
        return f"Deleted {deleted_count} old outstanding tokens"
    except Exception as exc:  # pragma: no cover - celery retry path
        self.retry(countdown=300, exc=exc)

