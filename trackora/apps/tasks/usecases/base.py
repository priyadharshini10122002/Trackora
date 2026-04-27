"""
Base use-case scaffolding for task workflow transitions.

Every workflow transition shares the same skeleton:
  1. Fetch the task (inside atomic block + select_for_update so concurrent
     transitions see a consistent view).
  2. Validate the workflow transition against the state machine
     (WorkflowEngine.validate_transition).
  3. Validate transition-specific business prerequisites
     (delegated to subclass _validate_prerequisites).
  4. Apply the state change (delegated to subclass _apply).
  5. Write an immutable TaskHistory row.
  6. Invalidate dependent cache entries.
  7. Emit a domain event.

Subclasses only have to declare:
  - target_status: TaskStatus
  - event class (via _build_event)
  - optional _validate_prerequisites / _apply overrides
  - optional default_reason / history_reason

This keeps each concrete use case short and focused on what is unique
to that transition, and guarantees every workflow action goes through the
same validation and audit path.
"""

from __future__ import annotations

import uuid
from dataclasses import dataclass, field
from typing import Optional

from django.db import transaction

from apps.tasks.models import Task, TaskHistory
from domain.events.domain_events import (
    DomainEvent,
    TaskStatusChangedEvent,
    event_dispatcher as default_dispatcher,
)
from domain.exceptions.domain_exceptions import EntityNotFoundError
from domain.value_objects.enums import TaskStatus, UserRole
from domain.workflows.workflows import WorkflowEngine
from infrastructure.cache.cache_service import CacheService


@dataclass
class WorkflowRequest:
    """Input DTO shared by every workflow use case."""

    task_id: uuid.UUID
    actor_id: uuid.UUID
    actor_role: UserRole
    reason: str = ""
    extra: dict = field(default_factory=dict)


@dataclass
class WorkflowResponse:
    """Output DTO returned by every workflow use case."""

    task_id: uuid.UUID
    old_status: str
    new_status: str


class WorkflowUseCase:
    """
    Abstract base for workflow transition use cases.

    Concrete subclasses must set `target_status` and override `_build_event`.
    They may optionally override `_validate_prerequisites` and `_apply`.
    """

    target_status: TaskStatus = None  # override in subclass
    default_reason: str = ""

    def __init__(self, event_dispatcher=None):
        # NB: `or default_dispatcher` (the module-level singleton) - the original
        # SubmitForApprovalUseCase had `event_dispatcher or event_dispatcher`
        # which, due to Python name resolution inside __init__, resolved to
        # the parameter itself (always falsy default) and never the singleton.
        self.event_dispatcher = event_dispatcher or default_dispatcher

    # ------------------------------------------------------------------ Public

    @transaction.atomic
    def execute(self, request: WorkflowRequest) -> WorkflowResponse:
        if self.target_status is None:
            raise NotImplementedError(
                f"{self.__class__.__name__} must declare target_status"
            )

        task = self._get_task(request.task_id)

        # 1. State machine check (includes role-based transition rules)
        WorkflowEngine.validate_transition(
            TaskStatus(task.status), self.target_status, request.actor_role
        )

        # 2. Extra business prerequisites specific to the transition
        self._validate_prerequisites(task, request)

        # 3. Actor-level permission check (creator/assignee rules beyond role)
        self._validate_actor(task, request)

        old_status = task.status

        # 4. Apply the state change (subclass can also update other fields)
        self._apply(task, request)
        task.status = self.target_status.value
        task.save(update_fields=self._save_fields())

        # 5. Audit trail
        TaskHistory.objects.create(
            task=task,
            old_status=old_status,
            new_status=task.status,
            changed_by_id=request.actor_id,
            reason=request.reason or self.default_reason,
            metadata=self._history_metadata(task, request),
        )

        # 6. Cache invalidation
        self._invalidate_cache(task)

        # 7. Emit domain events: the specific transition event, plus the
        # generic status-changed event so subscribers that care only about
        # status transitions (e.g. audit sinks) don't have to subscribe to
        # every concrete event type.
        primary_event = self._build_event(task, request)
        if primary_event is not None:
            self.event_dispatcher.dispatch(primary_event)
        self.event_dispatcher.dispatch(
            TaskStatusChangedEvent(
                task_id=task.id,
                old_status=old_status,
                new_status=task.status,
                changed_by_id=request.actor_id,
            )
        )

        return WorkflowResponse(
            task_id=task.id, old_status=old_status, new_status=task.status
        )

    # --------------------------------------------------------- Subclass hooks

    def _validate_prerequisites(self, task: Task, request: WorkflowRequest) -> None:
        """Override to add business rule checks beyond the state machine."""

    def _validate_actor(self, task: Task, request: WorkflowRequest) -> None:
        """Override to add actor-level checks (creator, assignee, etc.)."""

    def _apply(self, task: Task, request: WorkflowRequest) -> None:
        """Override to mutate other fields besides status before save()."""

    def _build_event(self, task: Task, request: WorkflowRequest) -> Optional[DomainEvent]:
        """Return the transition-specific domain event, or None."""
        return None

    def _save_fields(self):
        """Override to extend the list of fields saved on task.save()."""
        return ["status", "updated_at"]

    def _history_metadata(self, task: Task, request: WorkflowRequest) -> dict:
        """Override to attach extra JSON metadata on the history row."""
        return {}

    # ------------------------------------------------------------- Internals

    def _get_task(self, task_id: uuid.UUID) -> Task:
        # select_for_update locks the row until the transaction commits, so
        # two concurrent workflow requests cannot race through the state
        # machine and both succeed.
        try:
            return Task.objects.select_for_update().get(id=task_id)
        except Task.DoesNotExist as exc:
            raise EntityNotFoundError(entity_type="Task", entity_id=str(task_id)) from exc

    def _invalidate_cache(self, task: Task) -> None:
        CacheService.invalidate_task_detail(task.id)
        CacheService.invalidate_task_stats()
        CacheService.invalidate_task_stats(user_id=task.created_by_id)
        if task.assigned_to_id:
            CacheService.invalidate_task_stats(user_id=task.assigned_to_id)
