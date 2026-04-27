"""
Integration tests for the task workflow HTTP API.

These tests prove that every workflow action now routes through a domain
use case (so prerequisites, state-machine rules and audit trail are all
enforced) and that the previously-demonstrated bypass of
`WorkflowValidator.validate_approval_prerequisites` is fixed.

Each test drives the real DRF view stack, so a green run means:
  - the URL is wired
  - permissions pass
  - the use case runs inside a transaction
  - TaskHistory rows are written
  - the custom exception handler converts domain errors into the right
    HTTP status codes

Run:
    venv\\Scripts\\python.exe -m pytest tests/integration/test_workflow.py -v
"""

from datetime import timedelta

import pytest
from django.utils import timezone

from apps.tasks.models import Task, TaskHistory
from domain.value_objects.enums import TaskStatus


# --------------------------------------------------------------------------
# Helpers
# --------------------------------------------------------------------------

def _make_task(creator, **overrides):
    """Create a well-formed DRAFT task directly in the DB."""
    defaults = dict(
        title="Implement production deployment strategy",
        description="Task created for workflow integration test.",
        priority="MEDIUM",
        status=TaskStatus.DRAFT.value,
        due_date=timezone.now() + timedelta(days=3),
        sla_hours=24,
        created_by=creator,
    )
    defaults.update(overrides)
    return Task.objects.create(**defaults)


def _make_bad_task(creator):
    """
    Create a task with data that violates approval prerequisites:
    - title shorter than 10 characters
    - sla_hours = 0 (force-updated past the field validator)
    """
    task = Task.objects.create(
        title="short",  # violates >= 10 chars
        description="Task with invalid data for bypass test.",
        priority="MEDIUM",
        status=TaskStatus.DRAFT.value,
        due_date=timezone.now() + timedelta(days=1),
        sla_hours=1,  # field validator requires >= 1
        created_by=creator,
    )
    # Bypass the field validator via raw UPDATE to force sla_hours=0
    Task.objects.filter(id=task.id).update(sla_hours=0)
    task.refresh_from_db()
    return task


SUBMIT_URL = "/api/v1/tasks/{id}/submit_for_approval/"
APPROVE_URL = "/api/v1/tasks/{id}/approve/"
REJECT_URL = "/api/v1/tasks/{id}/reject/"
ASSIGN_URL = "/api/v1/tasks/{id}/assign/"
START_URL = "/api/v1/tasks/{id}/start/"
COMPLETE_URL = "/api/v1/tasks/{id}/complete/"
CLOSE_URL = "/api/v1/tasks/{id}/close/"


# --------------------------------------------------------------------------
# Regression: the original bypass is fixed
# --------------------------------------------------------------------------

@pytest.mark.django_db
def test_submit_for_approval_rejects_bad_prerequisites(manager_client, manager_user):
    """
    Regression guard for the prerequisites-bypass bug.

    Before the refactor, the view updated task.status directly and skipped
    WorkflowValidator.validate_approval_prerequisites, so a task with
    title='short' and sla_hours=0 could transition into PENDING_APPROVAL.

    After the refactor, the view delegates to SubmitForApprovalUseCase
    which raises BusinessRuleViolation, mapped to HTTP 400 by the custom
    exception handler. The task must stay in DRAFT.
    """
    bad = _make_bad_task(manager_user)

    response = manager_client.post(
        SUBMIT_URL.format(id=bad.id),
        {"reason": "try to bypass"},
        format="json",
    )

    assert response.status_code == 400, (
        f"Expected 400 for prerequisite violation, got {response.status_code}: "
        f"{getattr(response, 'data', response.content)!r}"
    )

    bad.refresh_from_db()
    assert bad.status == TaskStatus.DRAFT.value, (
        "Task status must stay DRAFT when prerequisites fail."
    )

    # And absolutely no audit row should have been written for the status change
    assert not TaskHistory.objects.filter(
        task=bad, new_status=TaskStatus.PENDING_APPROVAL.value
    ).exists()


# --------------------------------------------------------------------------
# Happy path: full workflow
# --------------------------------------------------------------------------

@pytest.mark.django_db
def test_full_happy_path_workflow(
    manager_client, contributor_client, manager_user, contributor_user
):
    """
    Walk a task through every transition via the HTTP API and verify the
    status at each step plus the audit trail at the end.
    """
    task = _make_task(manager_user)

    # DRAFT -> PENDING_APPROVAL (manager submits their own task)
    r = manager_client.post(SUBMIT_URL.format(id=task.id), {}, format="json")
    assert r.status_code == 200, r.data
    task.refresh_from_db()
    assert task.status == TaskStatus.PENDING_APPROVAL.value

    # PENDING_APPROVAL -> APPROVED
    r = manager_client.post(APPROVE_URL.format(id=task.id), {}, format="json")
    assert r.status_code == 200, r.data
    task.refresh_from_db()
    assert task.status == TaskStatus.APPROVED.value

    # Assign to a contributor
    r = manager_client.post(
        ASSIGN_URL.format(id=task.id),
        {"assigned_to_id": str(contributor_user.id), "notes": "please handle"},
        format="json",
    )
    assert r.status_code == 200, r.data
    task.refresh_from_db()
    assert task.assigned_to_id == contributor_user.id

    # APPROVED -> IN_PROGRESS (assignee starts)
    r = contributor_client.post(START_URL.format(id=task.id), {}, format="json")
    assert r.status_code == 200, r.data
    task.refresh_from_db()
    assert task.status == TaskStatus.IN_PROGRESS.value

    # IN_PROGRESS -> COMPLETED (assignee completes)
    r = contributor_client.post(COMPLETE_URL.format(id=task.id), {}, format="json")
    assert r.status_code == 200, r.data
    task.refresh_from_db()
    assert task.status == TaskStatus.COMPLETED.value

    # COMPLETED -> CLOSED
    r = manager_client.post(CLOSE_URL.format(id=task.id), {}, format="json")
    assert r.status_code == 200, r.data
    task.refresh_from_db()
    assert task.status == TaskStatus.CLOSED.value

    # Audit trail: there should be a history row for each status change
    history_statuses = set(
        TaskHistory.objects.filter(task=task).values_list("new_status", flat=True)
    )
    assert {
        TaskStatus.PENDING_APPROVAL.value,
        TaskStatus.APPROVED.value,
        TaskStatus.IN_PROGRESS.value,
        TaskStatus.COMPLETED.value,
        TaskStatus.CLOSED.value,
    }.issubset(history_statuses)


# --------------------------------------------------------------------------
# Rejection path
# --------------------------------------------------------------------------

@pytest.mark.django_db
def test_reject_sends_task_back_to_draft(manager_client, manager_user):
    task = _make_task(manager_user, status=TaskStatus.PENDING_APPROVAL.value)

    r = manager_client.post(
        REJECT_URL.format(id=task.id),
        {"reason": "Needs more detail"},
        format="json",
    )
    assert r.status_code == 200, r.data
    task.refresh_from_db()
    assert task.status == TaskStatus.DRAFT.value


# --------------------------------------------------------------------------
# State-machine violation is a 409 Conflict
# --------------------------------------------------------------------------

@pytest.mark.django_db
def test_cannot_approve_draft_task(manager_client, manager_user):
    """
    Trying to approve a task that is still in DRAFT must be rejected by
    the state machine (InvalidWorkflowTransitionError -> HTTP 409).
    """
    task = _make_task(manager_user, status=TaskStatus.DRAFT.value)

    r = manager_client.post(APPROVE_URL.format(id=task.id), {}, format="json")
    assert r.status_code == 409, (
        f"Expected 409 for invalid transition, got {r.status_code}: {r.data!r}"
    )

    task.refresh_from_db()
    assert task.status == TaskStatus.DRAFT.value


@pytest.mark.django_db
def test_cannot_start_unassigned_approved_task(manager_client, manager_user):
    """
    Starting an APPROVED task without an assignee must fail
    (BusinessRuleViolation from validate_start_prerequisites -> HTTP 400).
    """
    task = _make_task(manager_user, status=TaskStatus.APPROVED.value)

    r = manager_client.post(START_URL.format(id=task.id), {}, format="json")
    assert r.status_code == 400, r.data

    task.refresh_from_db()
    assert task.status == TaskStatus.APPROVED.value


# --------------------------------------------------------------------------
# Permission denial
# --------------------------------------------------------------------------

@pytest.mark.django_db
def test_contributor_cannot_approve(
    contributor_client, manager_user
):
    """
    Only managers/admins can approve tasks; contributors must be rejected
    by DRF permissions (HTTP 403).
    """
    task = _make_task(manager_user, status=TaskStatus.PENDING_APPROVAL.value)

    r = contributor_client.post(APPROVE_URL.format(id=task.id), {}, format="json")
    assert r.status_code in (403, 404), (
        f"Expected 403/404 for contributor approving, got {r.status_code}"
    )

    task.refresh_from_db()
    assert task.status == TaskStatus.PENDING_APPROVAL.value
