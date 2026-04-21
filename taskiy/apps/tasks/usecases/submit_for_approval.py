"""
Use case for submitting a task for approval.
"""

import uuid
from django.db import transaction
from django.utils import timezone

from apps.tasks.models import Task, TaskHistory
from domain.value_objects.enums import TaskStatus, UserRole
from domain.workflows.workflows import WorkflowEngine, WorkflowValidator
from domain.events.domain_events import TaskSubmittedForApprovalEvent, event_dispatcher
from domain.exceptions.domain_exceptions import BusinessRuleViolation, PermissionDeniedError


class SubmitForApprovalRequest:
    """Request DTO for task submission"""

    def __init__(self, task_id: uuid.UUID, submitted_by_id: uuid.UUID, user_role: UserRole):
        self.task_id = task_id
        self.submitted_by_id = submitted_by_id
        self.user_role = user_role


class SubmitForApprovalResponse:
    """Response DTO for task submission"""

    def __init__(self, task_id: uuid.UUID, status: str):
        self.task_id = task_id
        self.status = status


class SubmitForApprovalUseCase:
    """
    Use case for submitting a task for approval.

    Business Rules:
    - Only task creator or MANAGER can submit
    - Task must be in DRAFT status
    - All required fields must be filled

    Events:
    - Emits TaskSubmittedForApprovalEvent
    """

    def __init__(self, event_dispatcher=None):
        self.event_dispatcher = event_dispatcher or event_dispatcher

    @transaction.atomic
    def execute(self, request: SubmitForApprovalRequest) -> SubmitForApprovalResponse:
        """
        Execute the submit for approval use case.

        Args:
            request: SubmitForApprovalRequest with task and user details

        Returns:
            SubmitForApprovalResponse with updated task info

        Raises:
            BusinessRuleViolation: If business rules are violated
            PermissionDeniedError: If user lacks permission
        """
        # Get task
        try:
            task = Task.objects.get(id=request.task_id)
        except Task.DoesNotExist:
            raise BusinessRuleViolation(
                rule="Task not found",
                details=f"Task ID: {request.task_id}"
            )

        # Validate permissions
        self._validate_permissions(task, request)

        # Validate workflow transition
        WorkflowEngine.validate_transition(
            TaskStatus(task.status),
            TaskStatus.PENDING_APPROVAL,
            request.user_role
        )

        # Validate prerequisites
        WorkflowValidator.validate_approval_prerequisites(task)

        # Update task status
        old_status = task.status
        task.status = TaskStatus.PENDING_APPROVAL.value
        task.updated_at = timezone.now()
        task.save(update_fields=['status', 'updated_at'])

        # Create history record
        TaskHistory.objects.create(
            task=task,
            old_status=old_status,
            new_status=task.status,
            changed_by_id=request.submitted_by_id,
            reason="Task submitted for approval",
        )

        # Emit domain event
        event = TaskSubmittedForApprovalEvent(
            task_id=task.id,
            submitted_by_id=request.submitted_by_id,
        )
        self.event_dispatcher.dispatch(event)

        return SubmitForApprovalResponse(task_id=task.id, status=task.status)

    def _validate_permissions(self, task: Task, request: SubmitForApprovalRequest):
        """Validate user permissions for task submission"""
        # Only task creator or MANAGER can submit
        if task.created_by_id != request.submitted_by_id and request.user_role != UserRole.MANAGER:
            raise PermissionDeniedError(
                user_id=str(request.submitted_by_id),
                action="submit_task_for_approval",
                resource=f"task:{task.id}"
            )
