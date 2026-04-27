"""
Integration tests for the email notification channel.

These tests prove that high-signal domain events fan out to BOTH the in-app
Notification row AND an outgoing email, while low-signal events only create
the in-app row (to avoid email fatigue).

The test settings enable:
  * EMAIL_BACKEND = locmem   -> django.core.mail.outbox captures messages
  * CELERY_TASK_ALWAYS_EAGER -> .delay() runs synchronously in-process

Run:
    venv\\Scripts\\python.exe -m pytest tests/integration/test_email_notifications.py -v
"""

from datetime import timedelta

import pytest
from django.core import mail
from django.utils import timezone

from apps.notifications.event_handlers import _EMAIL_EVENTS, register_handlers
from apps.notifications.models import Notification
from apps.tasks.models import Task
from domain.events.domain_events import (
    CommentAddedEvent,
    SLABreachedEvent,
    TaskApprovedEvent,
    TaskAssignedEvent,
    TaskCompletedEvent,
    TaskRejectedEvent,
    event_dispatcher,
)
from domain.value_objects.enums import TaskStatus


# --------------------------------------------------------------------------
# Helpers
# --------------------------------------------------------------------------

def _make_task(creator, assignee=None, **overrides):
    defaults = dict(
        title="Email channel integration test",
        description="Task created to verify email fan-out.",
        priority="HIGH",
        status=TaskStatus.APPROVED.value,
        due_date=timezone.now() + timedelta(days=3),
        sla_hours=24,
        created_by=creator,
        assigned_to=assignee,
    )
    defaults.update(overrides)
    return Task.objects.create(**defaults)


@pytest.fixture(autouse=True)
def _ensure_handlers_registered():
    """
    Handlers are registered at app-ready time, but some test orders may swap
    dispatcher instances. Re-registering is idempotent and keeps the test
    self-contained.
    """
    register_handlers()
    mail.outbox = []
    yield


# --------------------------------------------------------------------------
# Config sanity
# --------------------------------------------------------------------------

def test_email_event_whitelist_matches_design():
    """The four high-signal events are the only ones that should send email."""
    assert _EMAIL_EVENTS == {
        "TaskAssignedEvent",
        "TaskApprovedEvent",
        "TaskRejectedEvent",
        "SLABreachedEvent",
    }


# --------------------------------------------------------------------------
# High-signal events -> email IS sent
# --------------------------------------------------------------------------

@pytest.mark.django_db
def test_task_assigned_event_sends_email(manager_user, contributor_user):
    task = _make_task(manager_user, assignee=contributor_user)

    event_dispatcher.dispatch(
        TaskAssignedEvent(
            task_id=task.id,
            assigned_to_id=contributor_user.id,
            assigned_by_id=manager_user.id,
        )
    )

    # In-app row exists
    assert Notification.objects.filter(
        recipient=contributor_user, notification_type="task_assigned"
    ).exists()

    # Email delivered to the assignee
    assert len(mail.outbox) == 1
    msg = mail.outbox[0]
    assert msg.to == [contributor_user.email]
    assert "Trackora" in msg.subject
    assert task.title in msg.subject


@pytest.mark.django_db
def test_task_rejected_event_sends_email(manager_user):
    task = _make_task(manager_user)

    event_dispatcher.dispatch(
        TaskRejectedEvent(
            task_id=task.id,
            rejected_by_id=manager_user.id,
            reason="Missing acceptance criteria",
        )
    )

    assert len(mail.outbox) == 1
    assert mail.outbox[0].to == [manager_user.email]


@pytest.mark.django_db
def test_sla_breached_event_sends_email(manager_user, contributor_user):
    task = _make_task(manager_user, assignee=contributor_user)

    event_dispatcher.dispatch(
        SLABreachedEvent(
            task_id=task.id,
            sla_hours=24,
            elapsed_hours=30.5,
        )
    )

    # Both creator and assignee get notified
    recipients = sorted(m.to[0] for m in mail.outbox)
    assert recipients == sorted([manager_user.email, contributor_user.email])


@pytest.mark.django_db
def test_task_approved_event_marks_notification_email_sent(manager_user):
    task = _make_task(manager_user)

    event_dispatcher.dispatch(
        TaskApprovedEvent(task_id=task.id, approved_by_id=manager_user.id)
    )

    assert len(mail.outbox) == 1
    notif = Notification.objects.get(
        recipient=manager_user, notification_type="task_approved"
    )
    # The Celery task calls mark_email_sent() on success
    assert notif.email_sent is True
    assert notif.email_sent_at is not None


# --------------------------------------------------------------------------
# Low-signal events -> email is NOT sent
# --------------------------------------------------------------------------

@pytest.mark.django_db
def test_task_completed_event_does_not_send_email(manager_user, contributor_user):
    task = _make_task(manager_user, assignee=contributor_user)

    event_dispatcher.dispatch(
        TaskCompletedEvent(task_id=task.id, completed_by_id=contributor_user.id)
    )

    # In-app notification still created...
    assert Notification.objects.filter(notification_type="task_completed").exists()
    # ...but no email goes out
    assert len(mail.outbox) == 0


@pytest.mark.django_db
def test_comment_added_event_does_not_send_email(manager_user, contributor_user):
    task = _make_task(manager_user, assignee=contributor_user)

    event_dispatcher.dispatch(
        CommentAddedEvent(
            task_id=task.id,
            comment_id=task.id,  # reuse uuid; handler doesn't dereference it
            author_id=contributor_user.id,
            is_internal=False,
        )
    )

    assert Notification.objects.filter(notification_type="comment_added").exists()
    assert len(mail.outbox) == 0


# --------------------------------------------------------------------------
# Preference honoring
# --------------------------------------------------------------------------

@pytest.mark.django_db
def test_email_skipped_when_user_preference_is_never(manager_user, contributor_user):
    from apps.notifications.models import NotificationPreference

    NotificationPreference.objects.create(
        user=contributor_user, email_frequency="never"
    )
    task = _make_task(manager_user, assignee=contributor_user)

    event_dispatcher.dispatch(
        TaskAssignedEvent(
            task_id=task.id,
            assigned_to_id=contributor_user.id,
            assigned_by_id=manager_user.id,
        )
    )

    # In-app row is still created (preferences only gate email, not in-app)
    assert Notification.objects.filter(recipient=contributor_user).exists()
    # But no email goes out
    assert len(mail.outbox) == 0
