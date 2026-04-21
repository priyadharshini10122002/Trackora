"""
Trackora Django Application
"""

# This keeps Django commands runnable even when celery extras are not installed.
try:
    from .celery import app as celery_app
except Exception:  # pragma: no cover - fallback for limited environments
    celery_app = None

__all__ = ("celery_app",)
