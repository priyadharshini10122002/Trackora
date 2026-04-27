"""
Use case: assign a task to a user.

Unlike the other workflow actions, assignment does NOT change the task's
status. It is a sideways action modelled as a transition-with-same-target
so we still get atomicity, audit logging and event dispatch.

Business rules:
- Task must be APPROVED, IN_PROGRESS, or COMPLETED (assignable states).
- Target user must exist and be active.
- Only MANAGER/ADMIN can assign (enforced at DRF permission layer, re-checked
  in the use case via actor_role).
"""

from __future__ import annotations

import uuid
from typing import Optional

from django.db import transaction

from apps.tasks.models import Assignment, Task, TaskHistory
from domain.events.domain_events import (
    TaskAssignedEvent,
    event_dispatcher as default_dispatcher,
)
from domain.exceptions.domain_exceptions import (
    AssignmentError,
    BusinessRuleViolation,
    EntityNotFoundError,
    PermissionDeniedError,
)
from domain.value_objects.enums import TaskStatus, UserRole
from infrastructure.cache.cache_service import CacheService


ASSIGNABLE_STATUSES = {
    TaskStatus.APPROVED.value,
    TaskStatus.IN_PROGRESS.value,
    TaskStatus.COMPLETED.value,
}


class AssignTaskRequest:
    """Input DTO."""

    def __init__(
        self,
        task_id: uuid.UUID,
        assigned_to_id: uuid.UUID,
        assigned_by_id: uuid.UUID,
        actor_role: UserRole,
        notes: str = "",
    ):
        self.task_id = task_id
        self.assigned_to_id = assigned_to_id
        self.assigned_by_id = assigned_by_id
        self.actor_role = actor_role
        self.notes = notes


class AssignTaskResponse:
    def __init__(self, task_id: uuid.UUID, assigned_to_id: uuid.UUID):
        self.task_id = task_id
        self.assigned_to_id = assigned_to_id


class AssignTaskUseCase:
    """
    Assignment is a non-status-changing mutation. It has its own use case
    instead of inheriting from WorkflowUseCase because the state machine
    does not model it as a transition.
    """

    def __init__(self, event_dispatcher=None):
        self.event_dispatcher = event_dispatcher or default_dispatcher

    @transaction.atomic
    def execute(self, request: AssignTaskRequest) -> AssignTaskResponse:
        if request.actor_role not in (UserRole.MANAGER, UserRole.ADMIN):
            raise PermissionDeniedError(
                user_id=str(request.assigned_by_id),
                action="assign_task",
                resource=f"task:{request.task_id}",
            )

        try:
            task = Task.objects.select_for_update().get(id=request.task_id)
        except Task.DoesNotExist as exc:
            raise EntityNotFoundError(
                entity_type="Task", entity_id=str(request.task_id)
            ) from exc

        if task.status not in ASSIGNABLE_STATUSES:
            raise BusinessRuleViolation(
                rule="Task must be approved, in progress, or completed to be assigned",
                details=f"Current status: {task.status}",
            )

        # Validate assignee exists and is active. Imported lazily to avoid a
        # circular import at module load.
        from apps.users.models import User

        try:
            assignee = User.objects.get(id=request.assigned_to_id)
        except User.DoesNotExist as exc:
            raise AssignmentError(
                task_id=str(task.id),
                user_id=str(request.assigned_to_id),
                reason="Assignee does not exist",
            ) from exc

        if not assignee.is_active:
            raise AssignmentError(
                task_id=str(task.id),
                user_id=str(request.assigned_to_id),
                reason="Assignee is not active",
            )

        old_assignee_id = task.assigned_to_id
        task.assigned_to_id = assignee.id
        task.save(update_fields=["assigned_to", "updated_at"])

        Assignment.objects.create(
            task=task,
            assigned_to=assignee,
            assigned_by_id=request.assigned_by_id,
            notes=request.notes,
        )

        TaskHistory.objects.create(
            task=task,
            old_status=task.status,
            new_status=task.status,  # status unchanged; this row records the assignment
            changed_by_id=request.assigned_by_id,
            reason=f"Task assigned to {assignee.email}",
            metadata={
                "event": "assignment",
                "old_assigned_to_id": str(old_assignee_id) if old_assignee_id else None,
                "new_assigned_to_id": str(assignee.id),
                "notes": request.notes,
            },
        )

        CacheService.invalidate_task_detail(task.id)
        CacheService.invalidate_task_stats()
        CacheService.invalidate_task_stats(user_id=task.created_by_id)
        CacheService.invalidate_task_stats(user_id=assignee.id)
        if old_assignee_id:
            CacheService.invalidate_task_stats(user_id=old_assignee_id)

        self.event_dispatcher.dispatch(
            TaskAssignedEvent(
                task_id=task.id,
                assigned_to_id=assignee.id,
                assigned_by_id=request.assigned_by_id,
            )
        )

        return AssignTaskResponse(task_id=task.id, assigned_to_id=assignee.id)
