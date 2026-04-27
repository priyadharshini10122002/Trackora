"""
Task management models for Trackora.
Implements Task, TaskHistory, Assignment, Comment, and Attachment models.
"""

import uuid
import os
from django.db import models
from django.conf import settings
from django.core.validators import MinValueValidator, FileExtensionValidator
from django.utils import timezone
from django.utils.translation import gettext_lazy as _
from domain.value_objects.enums import TaskStatus, TaskPriority


class TaskManager(models.Manager):
    """Custom manager for Task model - excludes soft-deleted tasks by default"""
    
    def get_queryset(self):
        return super().get_queryset().filter(is_deleted=False)
    
    def with_deleted(self):
        """Include soft-deleted tasks"""
        return super().get_queryset()
    
    def deleted_only(self):
        """Only soft-deleted tasks"""
        return super().get_queryset().filter(is_deleted=True)


class Task(models.Model):
    """
    Core Task model with workflow management.
    Implements soft delete pattern for audit trail integrity.
    """
    
    id = models.UUIDField(
        primary_key=True,
        default=uuid.uuid4,
        editable=False
    )
    title = models.CharField(
        max_length=150,
        help_text=_('Task title (10-150 characters)')
    )
    description = models.TextField(
        blank=True,
        help_text=_('Detailed task description')
    )
    priority = models.CharField(
        max_length=20,
        choices=TaskPriority.choices(),
        default=TaskPriority.MEDIUM.value,
        db_index=True,
        help_text=_('Task priority level')
    )
    status = models.CharField(
        max_length=30,
        choices=TaskStatus.choices(),
        default=TaskStatus.DRAFT.value,
        db_index=True,
        help_text=_('Current task status')
    )
    due_date = models.DateTimeField(
        help_text=_('Task due date and time')
    )
    sla_hours = models.PositiveIntegerField(
        validators=[MinValueValidator(1)],
        help_text=_('SLA in hours for task completion')
    )
    
    # Relationships
    created_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.PROTECT,
        related_name='created_tasks',
        help_text=_('User who created this task')
    )
    assigned_to = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='assigned_tasks',
        help_text=_('User assigned to this task')
    )
    
    # Soft delete fields
    is_deleted = models.BooleanField(
        default=False,
        db_index=True,
        help_text=_('Soft delete flag')
    )
    deleted_at = models.DateTimeField(
        null=True,
        blank=True,
        help_text=_('When task was soft deleted')
    )
    deleted_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='deleted_tasks',
        help_text=_('User who deleted this task')
    )
    
    # Timestamps
    created_at = models.DateTimeField(auto_now_add=True, db_index=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    # Custom manager
    objects = TaskManager()
    all_objects = models.Manager()  # Access all tasks including deleted
    
    class Meta:
        verbose_name = _('task')
        verbose_name_plural = _('tasks')
        db_table = 'tasks'
        ordering = ['-created_at']
        indexes = [
            models.Index(fields=['status']),
            models.Index(fields=['priority']),
            models.Index(fields=['due_date']),
            models.Index(fields=['assigned_to', 'status']),
            models.Index(fields=['created_by', 'status']),
            models.Index(fields=['is_deleted']),
            models.Index(fields=['-created_at']),
        ]
    
    def __str__(self):
        return f'{self.title} ({self.get_status_display()})'
    
    def soft_delete(self, user):
        """Soft delete the task"""
        self.is_deleted = True
        self.deleted_at = timezone.now()
        self.deleted_by = user
        self.save(update_fields=['is_deleted', 'deleted_at', 'deleted_by', 'updated_at'])
    
    def restore(self):
        """Restore a soft-deleted task"""
        self.is_deleted = False
        self.deleted_at = None
        self.deleted_by = None
        self.save(update_fields=['is_deleted', 'deleted_at', 'deleted_by', 'updated_at'])
    
    def is_overdue(self):
        """Check if task is overdue"""
        return timezone.now() > self.due_date and self.status != TaskStatus.CLOSED.value
    
    def is_sla_breached(self):
        """Check if SLA has been breached"""
        elapsed_hours = (timezone.now() - self.created_at).total_seconds() / 3600
        return elapsed_hours > self.sla_hours
    
    def get_elapsed_hours(self):
        """Get elapsed hours since task creation"""
        return (timezone.now() - self.created_at).total_seconds() / 3600


class TaskHistory(models.Model):
    """
    Immutable audit trail for task changes.
    Records all status transitions and modifications.
    """
    
    id = models.UUIDField(
        primary_key=True,
        default=uuid.uuid4,
        editable=False
    )
    task = models.ForeignKey(
        Task,
        on_delete=models.CASCADE,
        related_name='history'
    )
    old_status = models.CharField(
        max_length=30,
        choices=TaskStatus.choices(),
        blank=True,
        null=True
    )
    new_status = models.CharField(
        max_length=30,
        choices=TaskStatus.choices()
    )
    changed_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.PROTECT
    )
    reason = models.TextField(
        blank=True,
        help_text=_('Reason for status change')
    )
    metadata = models.JSONField(
        default=dict,
        blank=True,
        help_text=_('Additional context about the change')
    )
    timestamp = models.DateTimeField(
        auto_now_add=True,
        db_index=True
    )
    
    class Meta:
        verbose_name = _('task history')
        verbose_name_plural = _('task histories')
        db_table = 'task_history'
        ordering = ['-timestamp']
        indexes = [
            models.Index(fields=['task', '-timestamp']),
            models.Index(fields=['-timestamp']),
        ] 
        # Prevent modifications
     #   permissions = [('view_taskhistory', 'Can view task history'),]
    

    def __str__(self):
        return f'{self.task.title}: {self.old_status} → {self.new_status}'
    
    def save(self, *args, **kwargs):
        """Override save to prevent updates.

        We detect new-vs-existing via `self._state.adding` rather than
        `self.pk` because the id has a `default=uuid.uuid4`, which means
        self.pk is populated on instance construction — long before the
        first INSERT. Using `self.pk` here used to incorrectly block the
        very first save as well.
        """
        if not self._state.adding:
            raise ValueError('TaskHistory records cannot be modified')
        super().save(*args, **kwargs)
    
    def delete(self, *args, **kwargs):
        """Prevent deletion of history records"""
        raise ValueError('TaskHistory records cannot be deleted')


class Assignment(models.Model):
    """
    Task assignment tracking with audit trail.
    """
    
    id = models.UUIDField(
        primary_key=True,
        default=uuid.uuid4,
        editable=False
    )
    task = models.ForeignKey(
        Task,
        on_delete=models.CASCADE,
        related_name='assignments'
    )
    assigned_to = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name='task_assignments'
    )
    assigned_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.PROTECT,
        related_name='assignments_made'
    )
    assigned_at = models.DateTimeField(auto_now_add=True, db_index=True)
    notes = models.TextField(
        blank=True,
        help_text=_('Assignment notes or instructions')
    )
    
    class Meta:
        verbose_name = _('assignment')
        verbose_name_plural = _('assignments')
        db_table = 'assignments'
        ordering = ['-assigned_at']
        indexes = [
            models.Index(fields=['task', '-assigned_at']),
            models.Index(fields=['assigned_to', '-assigned_at']),
        ]
    
    def __str__(self):
        return f'{self.task.title} → {self.assigned_to.email}'


class Comment(models.Model):
    """
    Task comments with visibility control.
    Internal comments are only visible to MANAGER and ADMIN roles.
    """
    
    id = models.UUIDField(
        primary_key=True,
        default=uuid.uuid4,
        editable=False
    )
    task = models.ForeignKey(
        Task,
        on_delete=models.CASCADE,
        related_name='comments'
    )
    author = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.PROTECT,
        related_name='comments'
    )
    content = models.TextField(
        help_text=_('Comment content')
    )
    is_internal = models.BooleanField(
        default=False,
        db_index=True,
        help_text=_('Internal comments visible only to managers and admins')
    )
    created_at = models.DateTimeField(auto_now_add=True, db_index=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    class Meta:
        verbose_name = _('comment')
        verbose_name_plural = _('comments')
        db_table = 'comments'
        ordering = ['created_at']
        indexes = [
            models.Index(fields=['task', 'created_at']),
            models.Index(fields=['is_internal']),
        ]
    
    def __str__(self):
        visibility = 'Internal' if self.is_internal else 'Public'
        return f'{visibility} comment by {self.author.email} on {self.task.title}'


def task_attachment_path(instance, filename):
    """Generate upload path for task attachments"""
    # Format: attachments/task_<uuid>/filename
    return f'attachments/task_{instance.task.id}/{filename}'


class Attachment(models.Model):
    """
    Task file attachments with validation.
    Implements file size and type restrictions.
    """
    
    id = models.UUIDField(
        primary_key=True,
        default=uuid.uuid4,
        editable=False
    )
    task = models.ForeignKey(
        Task,
        on_delete=models.CASCADE,
        related_name='attachments'
    )
    uploaded_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.PROTECT,
        related_name='uploaded_attachments'
    )
    file = models.FileField(
        upload_to=task_attachment_path,
        validators=[
            FileExtensionValidator(
                allowed_extensions=['pdf', 'docx', 'xlsx', 'png', 'jpg', 'jpeg', 'txt']
            )
        ]
    )
    filename = models.CharField(
        max_length=255,
        blank=True, default='',
        help_text=_('Original filename')
    )
    file_size = models.PositiveIntegerField(
        default=0,
        help_text=_('File size in bytes')
    )
    mime_type = models.CharField(
        max_length=100,
        blank=True, default='',
        help_text=_('MIME type of the file')
    )
    uploaded_at = models.DateTimeField(auto_now_add=True, db_index=True)
    
    class Meta:
        verbose_name = _('attachment')
        verbose_name_plural = _('attachments')
        db_table = 'attachments'
        ordering = ['-uploaded_at']
        indexes = [
            models.Index(fields=['task', '-uploaded_at']),
        ]
    
    def __str__(self):
        return f'{self.filename} on {self.task.title}'
    
    def save(self, *args, **kwargs):
        """Set filename, file_size and mime_type on save"""
        if self.file:
            self.filename = os.path.basename(self.file.name)
            self.file_size = self.file.size
            if not self.mime_type:
                import mimetypes
                guessed, _ = mimetypes.guess_type(self.file.name)
                self.mime_type = guessed or 'application/octet-stream'
        super().save(*args, **kwargs)
    
    def delete(self, *args, **kwargs):
        """Delete file from storage when model is deleted"""
        if self.file:
            self.file.delete(save=False)
        super().delete(*args, **kwargs)
