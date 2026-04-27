"""Task use cases package."""

from apps.tasks.usecases.approve_task import ApproveTaskUseCase
from apps.tasks.usecases.assign_task import (
    AssignTaskRequest,
    AssignTaskResponse,
    AssignTaskUseCase,
)
from apps.tasks.usecases.base import WorkflowRequest, WorkflowResponse, WorkflowUseCase
from apps.tasks.usecases.close_task import CloseTaskUseCase
from apps.tasks.usecases.complete_task import CompleteTaskUseCase
from apps.tasks.usecases.reject_task import RejectTaskUseCase
from apps.tasks.usecases.start_task import StartTaskUseCase
from apps.tasks.usecases.submit_for_approval import (
    SubmitForApprovalRequest,
    SubmitForApprovalResponse,
    SubmitForApprovalUseCase,
)

__all__ = [
    "WorkflowRequest",
    "WorkflowResponse",
    "WorkflowUseCase",
    "SubmitForApprovalUseCase",
    "SubmitForApprovalRequest",
    "SubmitForApprovalResponse",
    "ApproveTaskUseCase",
    "RejectTaskUseCase",
    "AssignTaskUseCase",
    "AssignTaskRequest",
    "AssignTaskResponse",
    "StartTaskUseCase",
    "CompleteTaskUseCase",
    "CloseTaskUseCase",
]
