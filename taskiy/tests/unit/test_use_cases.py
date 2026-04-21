"""
Unit tests for use cases.
"""

import pytest
import uuid
from unittest.mock import Mock, patch
from datetime import datetime, timedelta

from apps.tasks.usecases.submit_for_approval import (
    SubmitForApprovalUseCase,
    SubmitForApprovalRequest,
    SubmitForApprovalResponse
)
from domain.value_objects.enums import TaskStatus, UserRole
from domain.exceptions.domain_exceptions import InvalidWorkflowTransitionError, PermissionDeniedError


class TestSubmitForApprovalUseCase:
    """Test cases for SubmitForApprovalUseCase"""

    def setup_method(self):
        """Set up test fixtures"""
        self.mock_repository = Mock()
        self.mock_event_dispatcher = Mock()
        self.mock_workflow_engine = Mock()

        self.use_case = SubmitForApprovalUseCase(
            repository=self.mock_repository,
            event_dispatcher=self.mock_event_dispatcher,
            workflow_engine=self.mock_workflow_engine
        )

    def test_successful_submission(self):
        """Test successful task submission for approval"""
        # Arrange
        task_id = uuid.uuid4()
        user_id = uuid.uuid4()

        # Mock task
        mock_task = Mock()
        mock_task.id = task_id
        mock_task.status = TaskStatus.DRAFT.value
        mock_task.created_by_id = user_id

        # Mock user with MANAGER role
        mock_user = Mock()
        mock_user.id = user_id
        mock_user.has_role.return_value = True  # Has MANAGER role

        self.mock_repository.get_by_id.return_value = mock_task
        self.mock_workflow_engine.can_transition.return_value = True
        self.mock_repository.save.return_value = mock_task

        request = SubmitForApprovalRequest(task_id=task_id, user_id=user_id)

        # Act
        response = self.use_case.execute(request)

        # Assert
        assert isinstance(response, SubmitForApprovalResponse)
        assert response.task_id == task_id
        assert response.new_status == TaskStatus.PENDING_APPROVAL.value

        # Verify interactions
        self.mock_repository.get_by_id.assert_called_once_with(task_id)
        self.mock_workflow_engine.can_transition.assert_called_once_with(
            TaskStatus.DRAFT, TaskStatus.PENDING_APPROVAL, UserRole.MANAGER
        )
        self.mock_repository.save.assert_called_once()
        self.mock_event_dispatcher.dispatch.assert_called_once()

    def test_task_not_found(self):
        """Test submission fails when task doesn't exist"""
        # Arrange
        task_id = uuid.uuid4()
        user_id = uuid.uuid4()

        self.mock_repository.get_by_id.side_effect = Exception("Task not found")

        request = SubmitForApprovalRequest(task_id=task_id, user_id=user_id)

        # Act & Assert
        with pytest.raises(Exception, match="Task not found"):
            self.use_case.execute(request)

    def test_invalid_workflow_transition(self):
        """Test submission fails for invalid workflow transition"""
        # Arrange
        task_id = uuid.uuid4()
        user_id = uuid.uuid4()

        mock_task = Mock()
        mock_task.id = task_id
        mock_task.status = TaskStatus.COMPLETED.value  # Wrong status

        mock_user = Mock()
        mock_user.has_role.return_value = True

        self.mock_repository.get_by_id.return_value = mock_task
        self.mock_workflow_engine.can_transition.return_value = False

        request = SubmitForApprovalRequest(task_id=task_id, user_id=user_id)

        # Act & Assert
        with pytest.raises(InvalidWorkflowTransitionError):
            self.use_case.execute(request)

    def test_insufficient_permissions(self):
        """Test submission fails when user lacks permissions"""
        # Arrange
        task_id = uuid.uuid4()
        user_id = uuid.uuid4()

        mock_task = Mock()
        mock_task.id = task_id
        mock_task.status = TaskStatus.DRAFT.value

        mock_user = Mock()
        mock_user.has_role.return_value = False  # No MANAGER role

        self.mock_repository.get_by_id.return_value = mock_task

        request = SubmitForApprovalRequest(task_id=task_id, user_id=user_id)

        # Act & Assert
        with pytest.raises(PermissionDeniedError):
            self.use_case.execute(request)

    def test_contributor_can_submit_own_task(self):
        """Test that CONTRIBUTOR can submit their own task"""
        # Arrange
        task_id = uuid.uuid4()
        user_id = uuid.uuid4()

        mock_task = Mock()
        mock_task.id = task_id
        mock_task.status = TaskStatus.DRAFT.value
        mock_task.created_by_id = user_id  # User created this task

        mock_user = Mock()
        mock_user.id = user_id
        mock_user.has_role.return_value = False  # CONTRIBUTOR role

        self.mock_repository.get_by_id.return_value = mock_task
        self.mock_workflow_engine.can_transition.return_value = True
        self.mock_repository.save.return_value = mock_task

        request = SubmitForApprovalRequest(task_id=task_id, user_id=user_id)

        # Act
        response = self.use_case.execute(request)

        # Assert
        assert response.task_id == task_id
        # Verify CONTRIBUTOR role was checked
        mock_user.has_role.assert_called_with(UserRole.MANAGER)

    def test_event_dispatch_on_success(self):
        """Test that domain events are dispatched on successful submission"""
        # Arrange
        task_id = uuid.uuid4()
        user_id = uuid.uuid4()

        mock_task = Mock()
        mock_task.id = task_id
        mock_task.status = TaskStatus.DRAFT.value
        mock_task.created_by_id = user_id

        mock_user = Mock()
        mock_user.has_role.return_value = True

        self.mock_repository.get_by_id.return_value = mock_task
        self.mock_workflow_engine.can_transition.return_value = True
        self.mock_repository.save.return_value = mock_task

        request = SubmitForApprovalRequest(task_id=task_id, user_id=user_id)

        # Act
        self.use_case.execute(request)

        # Assert
        self.mock_event_dispatcher.dispatch.assert_called_once()
        # The event should be TaskSubmittedForApprovalEvent
        event = self.mock_event_dispatcher.dispatch.call_args[0][0]
        assert hasattr(event, 'task_id')
        assert event.task_id == str(task_id)

    @patch('apps.tasks.usecases.submit_for_approval.transaction')
    def test_transaction_rollback_on_error(self, mock_transaction):
        """Test that transaction rolls back on error"""
        # Arrange
        task_id = uuid.uuid4()
        user_id = uuid.uuid4()

        mock_task = Mock()
        mock_task.id = task_id

        self.mock_repository.get_by_id.return_value = mock_task
        self.mock_workflow_engine.can_transition.side_effect = Exception("Workflow error")

        request = SubmitForApprovalRequest(task_id=task_id, user_id=user_id)

        # Act & Assert
        with pytest.raises(Exception):
            self.use_case.execute(request)

        # Transaction should have been used
        mock_transaction.atomic.assert_called_once()
