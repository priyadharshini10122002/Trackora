"""
Signal handlers for users app
"""

from django.db.models.signals import post_save
from django.dispatch import receiver
from .models import User, Role, UserRole


@receiver(post_save, sender=User)
def create_default_role_for_superuser(sender, instance, created, **kwargs):
    """Automatically assign ADMIN role to superusers"""
    if created and instance.is_superuser:
        admin_role, _ = Role.objects.get_or_create(
            name='ADMIN',
            defaults={'description': 'System administrator with full access'}
        )
        UserRole.objects.get_or_create(
            user=instance,
            role=admin_role,
            defaults={'assigned_by': instance}
        )
