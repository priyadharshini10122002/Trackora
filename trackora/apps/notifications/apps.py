"""
Notifications app configuration.
"""

from django.apps import AppConfig


class NotificationsConfig(AppConfig):
    default_auto_field = "django.db.models.BigAutoField"
    name = "apps.notifications"
    label = "notifications"
    verbose_name = "Notifications"

    def ready(self):
        # Attach domain event handlers to the global dispatcher once the app
        # is fully loaded. Deferred here (not at import time) because handlers
        # reference ORM models and the app registry must be ready.
        try:
            from apps.notifications.event_handlers import register_handlers

            register_handlers()
        except Exception:  # pragma: no cover - defensive
            # Never let handler wiring break app startup.
            import logging

            logging.getLogger(__name__).exception(
                "Failed to register notification event handlers"
            )
