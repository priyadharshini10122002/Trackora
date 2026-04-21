"""
Workflow engine for task state transitions.
This enforces business rules around allowed state changes.
"""

from typing import Dict, List, Set
from domain.value_objects.enums import TaskStatus, UserRole
from domain.exceptions.domain_exceptions import InvalidWorkflowTransitionError


class TransitionRule:
    """Represents a single allowed state transition"""

    def __init__(self, from_status: TaskStatus, to_status: TaskStatus, allowed_roles: List[UserRole]):
        self.from_status = from_status
        self.to_status = to_status
        self.allowed_roles = allowed_roles

    def can_transition(self, user_role: UserRole) -> bool:
        """Check if user role is allowed to perform this transition"""
        return user_role in self.allowed_roles


class WorkflowEngine:
    """
    Central workflow engine for task state transitions.
    Implements the state machine for task lifecycle.
    """

    # Define all allowed transitions
    TRANSITIONS: Dict[TaskStatus, Dict[TaskStatus, List[UserRole]]] = {
        TaskStatus.DRAFT: {
            TaskStatus.PENDING_APPROVAL: [UserRole.MANAGER, UserRole.ADMIN],
        },
        TaskStatus.PENDING_APPROVAL: {
            TaskStatus.APPROVED: [UserRole.MANAGER, UserRole.ADMIN],
            TaskStatus.DRAFT: [UserRole.MANAGER, UserRole.ADMIN],  # Rejection
        },
        TaskStatus.APPROVED: {
            TaskStatus.IN_PROGRESS: [UserRole.CONTRIBUTOR, UserRole.MANAGER, UserRole.ADMIN],
        },
        TaskStatus.IN_PROGRESS: {
            TaskStatus.COMPLETED: [UserRole.CONTRIBUTOR, UserRole.MANAGER, UserRole.ADMIN],
        },
        TaskStatus.COMPLETED: {
            TaskStatus.CLOSED: [UserRole.MANAGER, UserRole.ADMIN],
        },
    }

    @classmethod
    def can_transition(
        cls,
        from_status: TaskStatus,
        to_status: TaskStatus,
        user_role: UserRole
    ) -> bool:
        """
        Check if a transition is allowed.

        Args:
            from_status: Current task status
            to_status: Desired task status
            user_role: Role of user attempting transition

        Returns:
            True if transition is allowed, False otherwise
        """
        # Get allowed transitions from current status
        allowed_transitions = cls.TRANSITIONS.get(from_status, {})

        # Get allowed roles for this specific transition
        allowed_roles = allowed_transitions.get(to_status, [])

        # Check if user role is in allowed roles
        return user_role in allowed_roles

    @classmethod
    def validate_transition(
        cls,
        from_status: TaskStatus,
        to_status: TaskStatus,
        user_role: UserRole
    ) -> None:
        """
        Validate a transition, raising exception if not allowed.

        Args:
            from_status: Current task status
            to_status: Desired task status
            user_role: Role of user attempting transition

        Raises:
            InvalidWorkflowTransitionError: If transition is not allowed
        """
        if not cls.can_transition(from_status, to_status, user_role):
            raise InvalidWorkflowTransitionError(
                from_status=from_status.value,
                to_status=to_status.value,
                user_role=user_role.value
            )

    @classmethod
    def get_allowed_transitions(
        cls,
        from_status: TaskStatus,
        user_role: UserRole
    ) -> List[TaskStatus]:
        """
        Get all allowed transitions from current status for given user role.

        Args:
            from_status: Current task status
            user_role: User's role

        Returns:
            List of allowed target statuses
        """
        allowed_transitions = cls.TRANSITIONS.get(from_status, {})
        result = []

        for to_status, allowed_roles in allowed_transitions.items():
            if user_role in allowed_roles:
                result.append(to_status)

        return result

    @classmethod
    def get_all_transitions(cls) -> List[TransitionRule]:
        """Get all defined transition rules"""
        rules = []
        for from_status, transitions in cls.TRANSITIONS.items():
            for to_status, allowed_roles in transitions.items():
                rules.append(TransitionRule(from_status, to_status, allowed_roles))
        return rules

    @classmethod
    def is_terminal_status(cls, status: TaskStatus) -> bool:
        """Check if status is terminal (no outgoing transitions)"""
        return status not in cls.TRANSITIONS or len(cls.TRANSITIONS[status]) == 0

    @classmethod
    def get_initial_status(cls) -> TaskStatus:
        """Get the initial status for new tasks"""
        return TaskStatus.DRAFT


class WorkflowValidator:
    """Additional validation logic for workflow transitions"""

    @staticmethod
    def validate_approval_prerequisites(task) -> None:
        """Validate that task meets prerequisites for approval"""
        from domain.exceptions.domain_exceptions import BusinessRuleViolation

        if not task.title or len(task.title) < 10:
            raise BusinessRuleViolation(
                rule="Task must have title of at least 10 characters",
                details=f"Current title length: {len(task.title) if task.title else 0}"
            )

        if not task.due_date:
            raise BusinessRuleViolation(
                rule="Task must have a due date before approval"
            )

        if not task.sla_hours or task.sla_hours <= 0:
            raise BusinessRuleViolation(
                rule="Task must have valid SLA hours before approval"
            )

    @staticmethod
    def validate_assignment_prerequisites(task) -> None:
        """Validate that task can be assigned"""
        from domain.exceptions.domain_exceptions import InvalidTaskStateError

        if task.status != TaskStatus.APPROVED:
            raise InvalidTaskStateError(
                task_id=str(task.id),
                current_state=task.status.value,
                required_state=TaskStatus.APPROVED.value
            )

    @staticmethod
    def validate_start_prerequisites(task) -> None:
        """Validate that task can be started"""
        from domain.exceptions.domain_exceptions import BusinessRuleViolation

        if not task.assigned_to:
            raise BusinessRuleViolation(
                rule="Task must be assigned before it can be started"
            )

    @staticmethod
    def validate_completion_prerequisites(task) -> None:
        """Validate that task can be completed"""
        from domain.exceptions.domain_exceptions import InvalidTaskStateError

        if task.status != TaskStatus.IN_PROGRESS:
            raise InvalidTaskStateError(
                task_id=str(task.id),
                current_state=task.status.value,
                required_state=TaskStatus.IN_PROGRESS.value
            )
