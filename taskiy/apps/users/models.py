"""
Custom User model for Trackora.
Implements UUID primary key and role-based access control.
"""

import uuid
from django.contrib.auth.models import AbstractBaseUser, BaseUserManager, PermissionsMixin
from django.db import models
from django.utils import timezone
from django.utils.translation import gettext_lazy as _


class UserManager(BaseUserManager):
    """Custom manager for User model"""
    
    def create_user(self, email, password=None, **extra_fields):
        """Create and save a regular user"""
        if not email:
            raise ValueError(_('The Email field must be set'))
        
        email = self.normalize_email(email)
        user = self.model(email=email, **extra_fields)
        user.set_password(password)
        user.save(using=self._db)
        return user
    
    def create_superuser(self, email, password=None, **extra_fields):
        """Create and save a superuser"""
        extra_fields.setdefault('is_staff', True)
        extra_fields.setdefault('is_superuser', True)
        extra_fields.setdefault('is_active', True)
        
        if extra_fields.get('is_staff') is not True:
            raise ValueError(_('Superuser must have is_staff=True.'))
        if extra_fields.get('is_superuser') is not True:
            raise ValueError(_('Superuser must have is_superuser=True.'))
        
        return self.create_user(email, password, **extra_fields)


class User(AbstractBaseUser, PermissionsMixin):
    """
    Custom User model with email as username field.
    Uses UUID as primary key for better security and scalability.
    """
    
    id = models.UUIDField(
        primary_key=True,
        default=uuid.uuid4,
        editable=False
    )
    email = models.EmailField(
        _('email address'),
        unique=True,
        db_index=True,
        error_messages={
            'unique': _('A user with that email already exists.'),
        }
    )
    first_name = models.CharField(_('first name'), max_length=150, blank=True)
    last_name = models.CharField(_('last name'), max_length=150, blank=True)
    
    is_staff = models.BooleanField(
        _('staff status'),
        default=False,
        help_text=_('Designates whether the user can log into this admin site.'),
    )
    is_active = models.BooleanField(
        _('active'),
        default=True,
        help_text=_(
            'Designates whether this user should be treated as active. '
            'Unselect this instead of deleting accounts.'
        ),
    )
    date_joined = models.DateTimeField(_('date joined'), default=timezone.now)
    
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    objects = UserManager()
    
    USERNAME_FIELD = 'email'
    REQUIRED_FIELDS = ['first_name', 'last_name']
    
    class Meta:
        verbose_name = _('user')
        verbose_name_plural = _('users')
        db_table = 'users'
        ordering = ['-date_joined']
        indexes = [
            models.Index(fields=['email']),
            models.Index(fields=['is_active']),
            models.Index(fields=['-date_joined']),
        ]
    
    def __str__(self):
        return self.email
    
    def get_full_name(self):
        """Return the first_name plus the last_name, with a space in between."""
        full_name = f'{self.first_name} {self.last_name}'
        return full_name.strip()
    
    def get_short_name(self):
        """Return the short name for the user."""
        return self.first_name
    
    def has_role(self, role_name: str) -> bool:
        """Check if user has a specific role"""
        return self.user_roles.filter(role__name=role_name).exists()
    
    def get_roles(self):
        """Get all roles for this user"""
        return self.user_roles.select_related('role').all()
    
    def get_role_names(self):
        """Get list of role names for this user"""
        return list(self.user_roles.values_list('role__name', flat=True))


class Role(models.Model):
    """
    Role model for role-based access control.
    Roles are stored in database for flexibility.
    """
    
    id = models.UUIDField(
        primary_key=True,
        default=uuid.uuid4,
        editable=False
    )
    name = models.CharField(
        max_length=50,
        unique=True,
        db_index=True,
        help_text=_('Role name (e.g., ADMIN, MANAGER, CONTRIBUTOR, VIEWER)')
    )
    description = models.TextField(blank=True)
    
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    class Meta:
        verbose_name = _('role')
        verbose_name_plural = _('roles')
        db_table = 'roles'
        ordering = ['name']
    
    def __str__(self):
        return self.name


class UserRole(models.Model):
    """
    Junction table for User-Role many-to-many relationship.
    Includes audit fields for tracking role assignments.
    """
    
    id = models.UUIDField(
        primary_key=True,
        default=uuid.uuid4,
        editable=False
    )
    user = models.ForeignKey(
        User,
        on_delete=models.CASCADE,
        related_name='user_roles'
    )
    role = models.ForeignKey(
        Role,
        on_delete=models.CASCADE,
        related_name='role_users'
    )
    assigned_by = models.ForeignKey(
        User,
        on_delete=models.SET_NULL,
        null=True,
        related_name='role_assignments_made'
    )
    assigned_at = models.DateTimeField(auto_now_add=True)
    
    class Meta:
        verbose_name = _('user role')
        verbose_name_plural = _('user roles')
        db_table = 'user_roles'
        unique_together = [['user', 'role']]
        indexes = [
            models.Index(fields=['user', 'role']),
            models.Index(fields=['-assigned_at']),
        ]
    
    def __str__(self):
        return f'{self.user.email} - {self.role.name}'
