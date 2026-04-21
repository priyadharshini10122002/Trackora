"""
Celery tasks for Task management.
"""

from celery import shared_task
from django.utils import timezone
from django.core.mail import send_mail
from django.conf import settings
from django.db.models import Q

from apps.tasks.models import Task
from domain.value_objects.enums import TaskStatus
from domain.events.domain_events import SLABreachedEvent, EventDispatcher


@shared_task(bind=True, max_retries=3)
def check_sla_breaches(self):
    """
    Periodic task to check for SLA breaches.
    Runs every 5 minutes.
    """
    try:
        now = timezone.now()

        # Find tasks that have breached SLA
        breached_tasks = Task.objects.filter(
            Q(status__in=[TaskStatus.IN_PROGRESS.value, TaskStatus.APPROVED.value]) &
            Q(due_date__lt=now) &
            Q(is_deleted=False)
        ).select_related('assigned_to', 'created_by')

        breached_count = 0
        for task in breached_tasks:
            # Calculate breach duration in hours
            breach_duration = (now - task.due_date).total_seconds() / 3600

            # Emit SLA breach event
            event = SLABreachedEvent(
                task_id=str(task.id),
                task_title=task.title,
                assigned_to_email=task.assigned_to.email if task.assigned_to else None,
                created_by_email=task.created_by.email,
                due_date=task.due_date,
                breach_duration_hours=round(breach_duration, 2),
                sla_hours=task.sla_hours
            )

            # Dispatch event (this will trigger notifications)
            dispatcher = EventDispatcher()
            dispatcher.dispatch(event)

            breached_count += 1

        return f"Checked SLA breaches: {breached_count} tasks breached"

    except Exception as exc:
        # Retry with exponential backoff
        self.retry(countdown=60 * (2 ** self.request.retries), exc=exc)


@shared_task(bind=True, max_retries=3)
def send_task_notification(self, task_id, notification_type, recipient_emails):
    """
    Send email notification for task events.
    """
    try:
        task = Task.objects.get(id=task_id)

        subject_map = {
            'task_assigned': f'Task Assigned: {task.title}',
            'task_due_soon': f'Task Due Soon: {task.title}',
            'task_overdue': f'Task Overdue: {task.title}',
            'sla_breach': f'SLA Breach Alert: {task.title}',
            'task_approved': f'Task Approved: {task.title}',
            'task_rejected': f'Task Rejected: {task.title}',
            'task_completed': f'Task Completed: {task.title}',
            'task_closed': f'Task Closed: {task.title}',
        }

        subject = subject_map.get(notification_type, f'Task Update: {task.title}')

        # Create message based on notification type
        message = _build_notification_message(task, notification_type)

        # Send email
        send_mail(
            subject=subject,
            message=message,
            from_email=settings.DEFAULT_FROM_EMAIL,
            recipient_list=recipient_emails,
            fail_silently=False,
        )

        return f"Sent {notification_type} notification for task {task_id}"

    except Task.DoesNotExist:
        return f"Task {task_id} not found"
    except Exception as exc:
        self.retry(countdown=300, exc=exc)  # Retry after 5 minutes


def _build_notification_message(task, notification_type):
    """Build notification message based on type."""
    base_message = f"""
Task: {task.title}
Description: {task.description or 'No description'}
Priority: {task.priority}
Status: {task.status}
Due Date: {task.due_date}
SLA: {task.sla_hours} hours

Created by: {task.created_by.email}
"""

    if task.assigned_to:
        base_message += f"Assigned to: {task.assigned_to.email}\n"

    type_messages = {
        'task_assigned': "You have been assigned to this task.",
        'task_due_soon': "This task is due within 24 hours.",
        'task_overdue': "This task is now overdue.",
        'sla_breach': f"This task has breached its {task.sla_hours} hour SLA.",
        'task_approved': "This task has been approved and is ready for assignment.",
        'task_rejected': "This task has been rejected. Please review and resubmit.",
        'task_completed': "This task has been completed.",
        'task_closed': "This task has been closed.",
    }

    message = type_messages.get(notification_type, "Task status update.")
    return base_message + f"\n{message}"


@shared_task(bind=True, max_retries=3)
def cleanup_completed_tasks(self):
    """
    Periodic task to archive old completed tasks.
    Runs weekly.
    """
    try:
        # Archive tasks completed more than 90 days ago
        cutoff_date = timezone.now() - timezone.timedelta(days=90)

        archived_count = Task.objects.filter(
            status=TaskStatus.CLOSED.value,
            updated_at__lt=cutoff_date,
            is_deleted=False
        ).update(is_deleted=True, deleted_at=timezone.now())

        return f"Archived {archived_count} old completed tasks"

    except Exception as exc:
        self.retry(countdown=3600, exc=exc)  # Retry after 1 hour
