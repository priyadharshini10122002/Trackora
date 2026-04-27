"""
Use case: close a task (COMPLETED -> CLOSED).

Only MANAGER/ADMIN can close (enforced by state machine allowed_roles).
"""

from apps.tasks.models import Task
from apps.tasks.usecases.base import (
    WorkflowRequest,
    WorkflowUseCase,
)
from domain.events.domain_events import TaskClosedEvent
from domain.value_objects.enums import TaskStatus


class CloseTaskUseCase(WorkflowUseCase):
    target_status = TaskStatus.CLOSED
    default_reason = "Task closed"

    def _build_event(self, task: Task, request: WorkflowRequest):
        return TaskClosedEvent(task_id=task.id, closed_by_id=request.actor_id)
