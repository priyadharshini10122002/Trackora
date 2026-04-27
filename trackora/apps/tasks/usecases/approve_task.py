"""
Use case: approve a task (PENDING_APPROVAL -> APPROVED).

Only MANAGER/ADMIN (enforced by state machine allowed_roles).
"""

from apps.tasks.models import Task
from apps.tasks.usecases.base import (
    WorkflowRequest,
    WorkflowUseCase,
)
from domain.events.domain_events import TaskApprovedEvent
from domain.value_objects.enums import TaskStatus


class ApproveTaskUseCase(WorkflowUseCase):
    target_status = TaskStatus.APPROVED
    default_reason = "Task approved"

    def _build_event(self, task: Task, request: WorkflowRequest):
        return TaskApprovedEvent(task_id=task.id, approved_by_id=request.actor_id)
