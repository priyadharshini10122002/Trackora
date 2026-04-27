"""
Use case: start a task (APPROVED -> IN_PROGRESS).

Business rules:
- Task must be APPROVED (state machine).
- Task must be assigned to a user (WorkflowValidator.validate_start_prerequisites).
- The actor must be the assignee OR a MANAGER/ADMIN.
"""

from apps.tasks.models import Task
from apps.tasks.usecases.base import (
    WorkflowRequest,
    WorkflowUseCase,
)
from domain.events.domain_events import TaskStartedEvent
from domain.exceptions.domain_exceptions import PermissionDeniedError
from domain.value_objects.enums import TaskStatus, UserRole
from domain.workflows.workflows import WorkflowValidator


class StartTaskUseCase(WorkflowUseCase):
    target_status = TaskStatus.IN_PROGRESS
    default_reason = "Task started"

    def _validate_prerequisites(self, task: Task, request: WorkflowRequest) -> None:
        WorkflowValidator.validate_start_prerequisites(task)

    def _validate_actor(self, task: Task, request: WorkflowRequest) -> None:
        if request.actor_role in (UserRole.MANAGER, UserRole.ADMIN):
            return
        if task.assigned_to_id == request.actor_id:
            return
        raise PermissionDeniedError(
            user_id=str(request.actor_id),
            action="start_task",
            resource=f"task:{task.id}",
        )

    def _build_event(self, task: Task, request: WorkflowRequest):
        return TaskStartedEvent(task_id=task.id, started_by_id=request.actor_id)
