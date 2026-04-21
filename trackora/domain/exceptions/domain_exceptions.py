"""
Domain exceptions for Trackora.
Custom exceptions representing business rule violations.
"""


class DomainException(Exception):
    """Base class for all domain exceptions"""

    def __init__(self, message: str, details: dict = None):
        self.message = message
        self.details = details or {}
        super().__init__(self.message)


class InvalidWorkflowTransitionError(DomainException):
    """Raised when attempting an invalid workflow transition"""

    def __init__(self, from_status: str, to_status: str, user_role: str):
        message = f"Invalid workflow transition from {from_status} to {to_status} for role {user_role}"
        details = {
            "from_status": from_status,
            "to_status": to_status,
            "user_role": user_role,
        }
        super().__init__(message, details)


class PermissionDeniedError(DomainException):
    """Raised when user lacks permission for an action"""

    def __init__(self, user_id: str, action: str, resource: str):
        message = f"Permission denied for user {user_id} to perform {action} on {resource}"
        details = {
            "user_id": user_id,
            "action": action,
            "resource": resource,
        }
        super().__init__(message, details)


class BusinessRuleViolation(DomainException):
    """Raised when a business rule is violated"""

    def __init__(self, rule: str, details: str = None):
        message = f"Business rule violation: {rule}"
        if details:
            message += f" - {details}"
        super().__init__(message, {"rule": rule, "details": details})


class InvalidTaskStateError(DomainException):
    """Raised when task is in invalid state for operation"""

    def __init__(self, task_id: str, current_state: str, required_state: str):
        message = f"Task {task_id} is in state {current_state}, but requires state {required_state}"
        details = {
            "task_id": task_id,
            "current_state": current_state,
            "required_state": required_state,
        }
        super().__init__(message, details)


class AssignmentError(DomainException):
    """Raised when task assignment fails"""

    def __init__(self, task_id: str, user_id: str, reason: str):
        message = f"Cannot assign task {task_id} to user {user_id}: {reason}"
        details = {
            "task_id": task_id,
            "user_id": user_id,
            "reason": reason,
        }
        super().__init__(message, details)


class ValidationError(DomainException):
    """Raised when domain validation fails"""

    def __init__(self, field: str, value: str, reason: str):
        message = f"Validation failed for {field}: {reason}"
        details = {
            "field": field,
            "value": value,
            "reason": reason,
        }
        super().__init__(message, details)


class EntityNotFoundError(DomainException):
    """Raised when a domain entity is not found"""

    def __init__(self, entity_type: str, entity_id: str):
        message = f"{entity_type} with ID {entity_id} not found"
        details = {
            "entity_type": entity_type,
            "entity_id": entity_id,
        }
        super().__init__(message, details)


class DuplicateEntityError(DomainException):
    """Raised when attempting to create duplicate entity"""

    def __init__(self, entity_type: str, field: str, value: str):
        message = f"{entity_type} with {field} '{value}' already exists"
        details = {
            "entity_type": entity_type,
            "field": field,
            "value": value,
        }
        super().__init__(message, details)


class SLAViolationError(DomainException):
    """Raised when SLA is violated"""

    def __init__(self, task_id: str, sla_hours: int, elapsed_hours: float):
        message = f"SLA violated for task {task_id}: {elapsed_hours:.1f} hours elapsed, SLA is {sla_hours} hours"
        details = {
            "task_id": task_id,
            "sla_hours": sla_hours,
            "elapsed_hours": elapsed_hours,
        }
        super().__init__(message, details)
