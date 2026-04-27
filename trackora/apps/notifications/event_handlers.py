"""
Domain event -> Notification fan-out.

These handlers subscribe to task lifecycle events and create Notification rows
for the relevant recipients, honoring each user's NotificationPreference.

Design notes
------------
* Handlers are registered once at app startup (see NotificationsConfig.ready).
* Every handler is wrapped in try/except so a handler failure cannot break the
  business transaction that emitted the event (the EventDispatcher already
  catches exceptions, but we keep defensive try/except close to the DB calls
  too).
* `task_id` on the events is a uuid.UUID or uuid-like; we coerce to str-safe
  lookups by passing the value directly to the ORM.
* Email dispatch is delegated to the existing Celery task; here we only create
  the in-app Notification row synchronously.
"""

from __future__ import annotations

import logging
from typing import Iterable, Optional

from apps.notifications.models import Notification, NotificationPreference
from apps.tasks.models import Task
from domain.events.domain_events import (
    AttachmentAddedEvent,
    CommentAddedEvent,
    SLABreachedEvent,
    TaskApprovedEvent,
    TaskAssignedEvent,
    TaskClosedEvent,
    TaskCompletedEvent,
    TaskRejectedEvent,
    TaskStartedEvent,
    TaskSubmittedForApprovalEvent,
    event_dispatcher,
)


logger = logging.getLogger(__name__)


# Map event_type -> (NotificationPreference field, Notification type, priority,
# title prefix). Keeping all per-event configuration in one table makes it easy
# to add new events without forgetting to wire preferences.
# High-signal events that should also dispatch an email (in addition to the
# in-app Notification row). Low-signal events (comments, attachments, starts,
# completions, submissions, closures) stay in-app only to avoid email fatigue.
_EMAIL_EVENTS = frozenset({
    "TaskAssignedEvent",
    "TaskApprovedEvent",
    "TaskRejectedEvent",
    "SLABreachedEvent",
})


_EVENT_CONFIG = {
    "TaskAssignedEvent": ("task_assigned", "task_assigned", "high", "You have been assigned a task"),
    "TaskSubmittedForApprovalEvent": (None, "task_approved", "medium", "Task submitted for approval"),
    "TaskApprovedEvent": ("task_approved", "task_approved", "medium", "Task approved"),
    "TaskRejectedEvent": ("task_rejected", "task_rejected", "high", "Task rejected"),
    "TaskStartedEvent": (None, "task_completed", "low", "Task started"),
    "TaskCompletedEvent": ("task_completed", "task_completed", "medium", "Task completed"),
    "TaskClosedEvent": ("task_closed", "task_closed", "low", "Task closed"),
    "SLABreachedEvent": ("sla_breach", "sla_breach", "urgent", "SLA breach"),
    "CommentAddedEvent": ("comment_added", "comment_added", "low", "New comment"),
    "AttachmentAddedEvent": ("attachment_added", "attachment_added", "low", "New attachment"),
}


def _prefers(user, pref_field: Optional[str]) -> bool:
    """Return True if user wants this notification (defaults to True)."""
    if pref_field is None:
        return True
    prefs = NotificationPreference.objects.filter(user=user).first()
    if prefs is None:
        # No record yet -> defaults from the model (all True) apply.
        return True
    return bool(getattr(prefs, pref_field, True))


def _recipients(task: Task, event_type: str) -> Iterable:
    """
    Determine who should be notified for a given event on a given task.

    - Assignment events go to the assignee.
    - Approval/rejection/submission events go to the creator.
    - Completion/closure events go to both creator and assignee.
    - SLA breach goes to both.
    """
    users = set()
    if event_type == "TaskAssignedEvent":
        if task.assigned_to_id:
            users.add(task.assigned_to)
    elif event_type in ("TaskSubmittedForApprovalEvent", "TaskApprovedEvent", "TaskRejectedEvent"):
        users.add(task.created_by)
    elif event_type in ("TaskStartedEvent", "TaskCompletedEvent", "TaskClosedEvent", "SLABreachedEvent"):
        if task.created_by_id:
            users.add(task.created_by)
        if task.assigned_to_id:
            users.add(task.assigned_to)
    elif event_type in ("CommentAddedEvent", "AttachmentAddedEvent"):
        if task.created_by_id:
            users.add(task.created_by)
        if task.assigned_to_id:
            users.add(task.assigned_to)
    return users


def _create_notification(event, title_suffix: str = "", message: str = "") -> None:
    cfg = _EVENT_CONFIG.get(event.event_type)
    if cfg is None:
        return
    pref_field, notif_type, priority, title_prefix = cfg

    # The event's aggregate_id is the task_id for all task-scoped events, and
    # the user_id for role events. This handler only deals with task events.
    task = Task.all_objects.filter(id=event.aggregate_id).first()
    if task is None:
        logger.warning(
            "Notification handler could not find task for event",
            extra={"event_type": event.event_type, "aggregate_id": str(event.aggregate_id)},
        )
        return

    title = f"{title_prefix}: {task.title}"
    if title_suffix:
        title = f"{title} ({title_suffix})"
    body = message or title

    for user in _recipients(task, event.event_type):
        if user is None:
            continue
        if not _prefers(user, pref_field):
            continue
        try:
            notification = Notification.objects.create(
                recipient=user,
                notification_type=notif_type,
                title=title[:200],
                message=body,
                priority=priority,
                task=task,
            )
        except Exception:
            logger.exception(
                "Failed to create Notification row",
                extra={
                    "event_type": event.event_type,
                    "task_id": str(task.id),
                    "recipient_id": str(user.id),
                },
            )
            continue

        # Fan out to email channel for high-signal events only. The Celery
        # task honors the user's email_frequency preference and marks the
        # Notification.email_sent flag on success. We swallow broker errors
        # so a missing/down Redis cannot break the originating request.
        if event.event_type in _EMAIL_EVENTS:
            try:
                from apps.notifications.tasks import send_immediate_notification
                send_immediate_notification.delay(str(notification.id))
            except Exception:
                logger.exception(
                    "Failed to enqueue email notification task",
                    extra={
                        "event_type": event.event_type,
                        "notification_id": str(notification.id),
                    },
                )


# ------------------------------------------------------------------ handlers


def handle_task_submitted(event: TaskSubmittedForApprovalEvent) -> None:
    _create_notification(event, message="The task has been submitted for approval.")


def handle_task_approved(event: TaskApprovedEvent) -> None:
    _create_notification(event, message="The task has been approved.")


def handle_task_rejected(event: TaskRejectedEvent) -> None:
    reason = event.event_data.get("reason") or "No reason provided"
    _create_notification(event, message=f"The task was rejected. Reason: {reason}")


def handle_task_assigned(event: TaskAssignedEvent) -> None:
    _create_notification(event, message="You have been assigned to this task.")


def handle_task_started(event: TaskStartedEvent) -> None:
    _create_notification(event, message="Work has started on this task.")


def handle_task_completed(event: TaskCompletedEvent) -> None:
    _create_notification(event, message="The task has been marked completed.")


def handle_task_closed(event: TaskClosedEvent) -> None:
    _create_notification(event, message="The task has been closed.")


def handle_sla_breached(event: SLABreachedEvent) -> None:
    sla = event.event_data.get("sla_hours")
    elapsed = event.event_data.get("elapsed_hours")
    _create_notification(
        event,
        message=f"SLA of {sla} hours breached; {elapsed:.1f} hours elapsed."
        if sla is not None and elapsed is not None
        else "SLA breached",
    )


def handle_comment_added(event: CommentAddedEvent) -> None:
    if event.event_data.get("is_internal"):
        # Internal comments are not broadcast to non-elevated recipients.
        return
    _create_notification(event, message="A new comment was added to the task.")


def handle_attachment_added(event: AttachmentAddedEvent) -> None:
    filename = event.event_data.get("filename", "")
    _create_notification(event, message=f"A new attachment was added: {filename}")


# ---------------------------------------------------------------- registration


def register_handlers(dispatcher=None) -> None:
    """Attach every handler to the dispatcher. Safe to call multiple times."""
    d = dispatcher or event_dispatcher
    mapping = {
        "TaskSubmittedForApprovalEvent": handle_task_submitted,
        "TaskApprovedEvent": handle_task_approved,
        "TaskRejectedEvent": handle_task_rejected,
        "TaskAssignedEvent": handle_task_assigned,
        "TaskStartedEvent": handle_task_started,
        "TaskCompletedEvent": handle_task_completed,
        "TaskClosedEvent": handle_task_closed,
        "SLABreachedEvent": handle_sla_breached,
        "CommentAddedEvent": handle_comment_added,
        "AttachmentAddedEvent": handle_attachment_added,
    }
    for event_type, handler in mapping.items():
        # Avoid duplicate registration on dev reloads.
        handlers = d._handlers.get(event_type, [])  # noqa: SLF001 (internal, but module-owned)
        if handler in handlers:
            continue
        d.register_handler(event_type, handler)
