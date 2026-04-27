"""
Use case: submit a task for approval (DRAFT -> PENDING_APPROVAL).

Business rules:
- Only the task creator, MANAGER or ADMIN can submit.
- Task must be in DRAFT (enforced by the state machine).
- Task must have a title of at least 10 characters, a due_date, and a
  positive sla_hours (WorkflowValidator.validate_approval_prerequisites).
"""

from __future__ import annotations

import uuid
from dataclasses import dataclass
from typing import Optional

from apps.tasks.models import Task
from apps.tasks.usecases.base import (
    WorkflowRequest,
    WorkflowResponse,
    WorkflowUseCase,
)
from domain.events.domain_events import TaskSubmittedForApprovalEvent
from domain.exceptions.domain_exceptions import PermissionDeniedError
from domain.value_objects.enums import TaskStatus, UserRole
from domain.workflows.workflows import WorkflowValidator


# Back-compat aliases: the original implementation exposed these names and
# legacy code / tests may still import them. Keep the public surface stable.
@dataclass
class SubmitForApprovalRequest:
    task_id: uuid.UUID
    submitted_by_id: uuid.UUID
    user_role: UserRole
    reason: str = ""


@dataclass
class SubmitForApprovalResponse:
    task_id: uuid.UUID
    status: str


class SubmitForApprovalUseCase(WorkflowUseCase):
    target_status = TaskStatus.PENDING_APPROVAL
    default_reason = "Task submitted for approval"

    def _validate_prerequisites(self, task: Task, request: WorkflowRequest) -> None:
        WorkflowValidator.validate_approval_prerequisites(task)

    def _validate_actor(self, task: Task, request: WorkflowRequest) -> None:
        # Only the creator, a MANAGER or an ADMIN can submit. We still rely on
        # DRF-layer RBAC, but the domain enforces it independently so the use
        # case is safe to call from a non-HTTP context.
        if request.actor_role in (UserRole.MANAGER, UserRole.ADMIN):
            return
        if task.created_by_id == request.actor_id:
            return
        raise PermissionDeniedError(
            user_id=str(request.actor_id),
            action="submit_task_for_approval",
            resource=f"task:{task.id}",
        )

    def _build_event(self, task: Task, request: WorkflowRequest):
        return TaskSubmittedForApprovalEvent(
            task_id=task.id, submitted_by_id=request.actor_id
        )

    # -------- Legacy adapter: accept the old request type -----------------

    def execute(self, request):  # type: ignore[override]
        if isinstance(request, SubmitForApprovalRequest):
            wf_req = WorkflowRequest(
                task_id=request.task_id,
                actor_id=request.submitted_by_id,
                actor_role=request.user_role,
                reason=request.reason,
            )
            wf_resp = super().execute(wf_req)
            return SubmitForApprovalResponse(
                task_id=wf_resp.task_id, status=wf_resp.new_status
            )
        return super().execute(request)
