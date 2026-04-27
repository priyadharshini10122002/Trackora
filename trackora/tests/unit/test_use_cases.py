"""
DB-backed unit tests for task workflow use cases.

These test the post-Clean-Architecture use-case objects directly (no HTTP
layer). They exercise the real ORM against a sqlite test DB so we catch:
  - prerequisite validation (title length, sla_hours)
  - actor-permission rules (creator vs role)
  - state-machine transition rules
  - event dispatch
  - TaskHistory row creation
  - transaction rollback on error

Previously this file mocked a Repository abstraction that no longer exists;
after the refactor the use cases talk to `apps.tasks.models` directly, so
it's both simpler and more truthful to test against a real DB.
"""

from datetime import timedelta
from unittest.mock import Mock
from uuid import uuid4

import pytest
from django.utils import timezone

from apps.tasks.models import Task, TaskHistory
from apps.tasks.usecases import (
    ApproveTaskUseCase,
    CompleteTaskUseCase,
    RejectTaskUseCase,
    StartTaskUseCase,
    SubmitForApprovalUseCase,
    WorkflowRequest,
)
from apps.tasks.usecases.submit_for_approval import (
    SubmitForApprovalRequest,
    SubmitForApprovalResponse,
)
from domain.events.domain_events import TaskSubmittedForApprovalEvent
from domain.exceptions.domain_exceptions import (
    BusinessRuleViolation,
    EntityNotFoundError,
    InvalidWorkflowTransitionError,
    PermissionDeniedError,
)
from domain.value_objects.enums import TaskStatus, UserRole


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

def _valid_task(creator, **overrides):
    defaults = dict(
        title="Implement production deployment strategy",
        description="Task for unit test",
        priority="MEDIUM",
        status=TaskStatus.DRAFT.value,
        due_date=timezone.now() + timedelta(days=3),
        sla_hours=24,
        created_by=creator,
    )
    defaults.update(overrides)
    return Task.objects.create(**defaults)


# ---------------------------------------------------------------------------
# SubmitForApprovalUseCase
# ---------------------------------------------------------------------------

@pytest.mark.django_db
class TestSubmitForApprovalUseCase:

    def test_successful_submission_by_manager(self, manager_user):
        task = _valid_task(manager_user)
        dispatcher = Mock()

        use_case = SubmitForApprovalUseCase(event_dispatcher=dispatcher)
        response = use_case.execute(
            WorkflowRequest(
                task_id=task.id,
                actor_id=manager_user.id,
                actor_role=UserRole.MANAGER,
            )
        )

        task.refresh_from_db()
        assert task.status == TaskStatus.PENDING_APPROVAL.value
        assert response.new_status == TaskStatus.PENDING_APPROVAL.value

        # History row was written
        assert TaskHistory.objects.filter(
            task=task,
            old_status=TaskStatus.DRAFT.value,
            new_status=TaskStatus.PENDING_APPROVAL.value,
        ).exists()

        # Domain event was dispatched (primary + status-changed = 2)
        assert dispatcher.dispatch.call_count == 2
        first_event = dispatcher.dispatch.call_args_list[0][0][0]
        assert isinstance(first_event, TaskSubmittedForApprovalEvent)

    def test_legacy_request_dto_still_works(self, manager_user):
        """
        The public API of SubmitForApprovalUseCase must accept the legacy
        SubmitForApprovalRequest DTO so existing import paths don't break.
        """
        task = _valid_task(manager_user)

        use_case = SubmitForApprovalUseCase(event_dispatcher=Mock())
        response = use_case.execute(
            SubmitForApprovalRequest(
                task_id=task.id,
                submitted_by_id=manager_user.id,
                user_role=UserRole.MANAGER,
            )
        )

        assert isinstance(response, SubmitForApprovalResponse)
        assert response.status == TaskStatus.PENDING_APPROVAL.value

    def test_task_not_found_raises_entity_not_found(self, manager_user):
        use_case = SubmitForApprovalUseCase(event_dispatcher=Mock())

        with pytest.raises(EntityNotFoundError):
            use_case.execute(
                WorkflowRequest(
                    task_id=uuid4(),
                    actor_id=manager_user.id,
                    actor_role=UserRole.MANAGER,
                )
            )

    def test_invalid_transition_from_completed(self, manager_user):
        """COMPLETED -> PENDING_APPROVAL is not allowed by the state machine."""
        task = _valid_task(manager_user, status=TaskStatus.COMPLETED.value)

        use_case = SubmitForApprovalUseCase(event_dispatcher=Mock())
        with pytest.raises(InvalidWorkflowTransitionError):
            use_case.execute(
                WorkflowRequest(
                    task_id=task.id,
                    actor_id=manager_user.id,
                    actor_role=UserRole.MANAGER,
                )
            )

        task.refresh_from_db()
        assert task.status == TaskStatus.COMPLETED.value

    def test_bad_prerequisites_raises_business_rule_violation(self, manager_user):
        """title < 10 chars must trip validate_approval_prerequisites."""
        task = _valid_task(manager_user, title="short")
        # sla_hours has MinValueValidator(1) at the field level, but the
        # domain rule is sla_hours > 0, so we only need to trigger the
        # title rule here.

        use_case = SubmitForApprovalUseCase(event_dispatcher=Mock())
        with pytest.raises(BusinessRuleViolation):
            use_case.execute(
                WorkflowRequest(
                    task_id=task.id,
                    actor_id=manager_user.id,
                    actor_role=UserRole.MANAGER,
                )
            )

        # Transaction must have rolled back: status still DRAFT, no history
        task.refresh_from_db()
        assert task.status == TaskStatus.DRAFT.value
        assert not TaskHistory.objects.filter(task=task).exists()

    def test_contributor_cannot_submit_due_to_state_machine(self, contributor_user):
        """
        The state-machine does not allow a CONTRIBUTOR role to drive the
        DRAFT -> PENDING_APPROVAL transition (regardless of ownership).
        This is rejected at the WorkflowEngine layer before the use case
        even reaches its own actor-permission check.
        """
        task = _valid_task(contributor_user)

        use_case = SubmitForApprovalUseCase(event_dispatcher=Mock())
        with pytest.raises(InvalidWorkflowTransitionError):
            use_case.execute(
                WorkflowRequest(
                    task_id=task.id,
                    actor_id=contributor_user.id,
                    actor_role=UserRole.CONTRIBUTOR,
                )
            )

        task.refresh_from_db()
        assert task.status == TaskStatus.DRAFT.value

    def test_contributor_cannot_submit_someone_elses_task(
        self, manager_user, contributor_user
    ):
        """
        A CONTRIBUTOR submitting someone else's task must be rejected.
        Either the state machine or the actor-permission check will block
        it; the important property is that no transition happens.
        """
        task = _valid_task(manager_user)  # created by manager

        use_case = SubmitForApprovalUseCase(event_dispatcher=Mock())
        with pytest.raises((PermissionDeniedError, InvalidWorkflowTransitionError)):
            use_case.execute(
                WorkflowRequest(
                    task_id=task.id,
                    actor_id=contributor_user.id,
                    actor_role=UserRole.CONTRIBUTOR,
                )
            )

        task.refresh_from_db()
        assert task.status == TaskStatus.DRAFT.value


# ---------------------------------------------------------------------------
# Approve / Reject
# ---------------------------------------------------------------------------

@pytest.mark.django_db
class TestApproveAndReject:

    def test_approve_transitions_to_approved(self, manager_user):
        task = _valid_task(manager_user, status=TaskStatus.PENDING_APPROVAL.value)

        ApproveTaskUseCase(event_dispatcher=Mock()).execute(
            WorkflowRequest(
                task_id=task.id,
                actor_id=manager_user.id,
                actor_role=UserRole.MANAGER,
            )
        )

        task.refresh_from_db()
        assert task.status == TaskStatus.APPROVED.value

    def test_reject_sends_back_to_draft(self, manager_user):
        task = _valid_task(manager_user, status=TaskStatus.PENDING_APPROVAL.value)

        RejectTaskUseCase(event_dispatcher=Mock()).execute(
            WorkflowRequest(
                task_id=task.id,
                actor_id=manager_user.id,
                actor_role=UserRole.MANAGER,
                reason="needs work",
            )
        )

        task.refresh_from_db()
        assert task.status == TaskStatus.DRAFT.value


# ---------------------------------------------------------------------------
# Start / Complete
# ---------------------------------------------------------------------------

@pytest.mark.django_db
class TestStartAndComplete:

    def test_start_requires_assignment(self, manager_user):
        """APPROVED task with no assignee must be rejected by prerequisites."""
        task = _valid_task(manager_user, status=TaskStatus.APPROVED.value)

        with pytest.raises(BusinessRuleViolation):
            StartTaskUseCase(event_dispatcher=Mock()).execute(
                WorkflowRequest(
                    task_id=task.id,
                    actor_id=manager_user.id,
                    actor_role=UserRole.MANAGER,
                )
            )

        task.refresh_from_db()
        assert task.status == TaskStatus.APPROVED.value

    def test_start_succeeds_when_assigned(self, manager_user, contributor_user):
        task = _valid_task(
            manager_user,
            status=TaskStatus.APPROVED.value,
            assigned_to=contributor_user,
        )

        StartTaskUseCase(event_dispatcher=Mock()).execute(
            WorkflowRequest(
                task_id=task.id,
                actor_id=contributor_user.id,
                actor_role=UserRole.CONTRIBUTOR,
            )
        )

        task.refresh_from_db()
        assert task.status == TaskStatus.IN_PROGRESS.value

    def test_complete_requires_in_progress(
        self, manager_user, contributor_user
    ):
        task = _valid_task(
            manager_user,
            status=TaskStatus.IN_PROGRESS.value,
            assigned_to=contributor_user,
        )

        CompleteTaskUseCase(event_dispatcher=Mock()).execute(
            WorkflowRequest(
                task_id=task.id,
                actor_id=contributor_user.id,
                actor_role=UserRole.CONTRIBUTOR,
            )
        )

        task.refresh_from_db()
        assert task.status == TaskStatus.COMPLETED.value
