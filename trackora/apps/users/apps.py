"""
Users app configuration
"""

from django.apps import AppConfig


class UsersConfig(AppConfig):
    default_auto_field = 'django.db.models.BigAutoField'
    name = 'apps.users'
    label = 'users'
    verbose_name = 'User Management'
    
    def ready(self):
        """Import signal handlers when app is ready"""
        try:
            import apps.users.signals  # noqa
        except ImportError:
            pass
