"""
Use case: complete a task (IN_PROGRESS -> COMPLETED).

Business rules:
- Task must be IN_PROGRESS (enforced both by state machine and
  WorkflowValidator.validate_completion_prerequisites).
- Only the assignee or a MANAGER/ADMIN can complete.
"""

from apps.tasks.models import Task
from apps.tasks.usecases.base import (
    WorkflowRequest,
    WorkflowUseCase,
)
from domain.events.domain_events import TaskCompletedEvent
from domain.exceptions.domain_exceptions import PermissionDeniedError
from domain.value_objects.enums import TaskStatus, UserRole
from domain.workflows.workflows import WorkflowValidator


class CompleteTaskUseCase(WorkflowUseCase):
    target_status = TaskStatus.COMPLETED
    default_reason = "Task completed"

    def _validate_prerequisites(self, task: Task, request: WorkflowRequest) -> None:
        # validate_completion_prerequisites compares against the enum; the
        # model stores strings, so normalise first.
        class _Shim:
            def __init__(self, task):
                self.status = TaskStatus(task.status)

        WorkflowValidator.validate_completion_prerequisites(_Shim(task))

    def _validate_actor(self, task: Task, request: WorkflowRequest) -> None:
        if request.actor_role in (UserRole.MANAGER, UserRole.ADMIN):
            return
        if task.assigned_to_id == request.actor_id:
            return
        raise PermissionDeniedError(
            user_id=str(request.actor_id),
            action="complete_task",
            resource=f"task:{task.id}",
        )

    def _build_event(self, task: Task, request: WorkflowRequest):
        return TaskCompletedEvent(task_id=task.id, completed_by_id=request.actor_id)
