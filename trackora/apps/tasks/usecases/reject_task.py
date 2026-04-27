"""
Use case: reject a task (PENDING_APPROVAL -> DRAFT).

Only MANAGER/ADMIN (enforced by state machine allowed_roles).
The reason is stored verbatim on the TaskHistory row for traceability.
"""

from apps.tasks.models import Task
from apps.tasks.usecases.base import (
    WorkflowRequest,
    WorkflowUseCase,
)
from domain.events.domain_events import TaskRejectedEvent
from domain.value_objects.enums import TaskStatus


class RejectTaskUseCase(WorkflowUseCase):
    target_status = TaskStatus.DRAFT
    default_reason = "Task rejected"

    def _build_event(self, task: Task, request: WorkflowRequest):
        return TaskRejectedEvent(
            task_id=task.id,
            rejected_by_id=request.actor_id,
            reason=request.reason,
        )
