"""
Domain events for Trackora.
Events represent significant business occurrences that other parts of the system might be interested in.
"""

import uuid
from datetime import datetime
from typing import Any, Dict, Optional
from dataclasses import dataclass


@dataclass
class DomainEvent:
    """Base class for all domain events"""

    event_id: uuid.UUID
    event_type: str
    aggregate_id: uuid.UUID  # ID of the aggregate root
    occurred_at: datetime
    event_data: Dict[str, Any]

    def __init__(self, aggregate_id: uuid.UUID, event_data: Dict[str, Any] = None):
        self.event_id = uuid.uuid4()
        self.event_type = self.__class__.__name__
        self.aggregate_id = aggregate_id
        self.occurred_at = datetime.now()
        self.event_data = event_data or {}


@dataclass
class TaskCreatedEvent(DomainEvent):
    """Emitted when a new task is created"""

    def __init__(self, task_id: uuid.UUID, created_by_id: uuid.UUID, title: str):
        super().__init__(
            aggregate_id=task_id,
            event_data={
                "created_by_id": str(created_by_id),
                "title": title,
            }
        )


@dataclass
class TaskSubmittedForApprovalEvent(DomainEvent):
    """Emitted when task is submitted for approval"""

    def __init__(self, task_id: uuid.UUID, submitted_by_id: uuid.UUID):
        super().__init__(
            aggregate_id=task_id,
            event_data={
                "submitted_by_id": str(submitted_by_id),
            }
        )


@dataclass
class TaskApprovedEvent(DomainEvent):
    """Emitted when task is approved"""

    def __init__(self, task_id: uuid.UUID, approved_by_id: uuid.UUID):
        super().__init__(
            aggregate_id=task_id,
            event_data={
                "approved_by_id": str(approved_by_id),
            }
        )


@dataclass
class TaskRejectedEvent(DomainEvent):
    """Emitted when task is rejected"""

    def __init__(self, task_id: uuid.UUID, rejected_by_id: uuid.UUID, reason: str = ""):
        super().__init__(
            aggregate_id=task_id,
            event_data={
                "rejected_by_id": str(rejected_by_id),
                "reason": reason,
            }
        )


@dataclass
class TaskAssignedEvent(DomainEvent):
    """Emitted when task is assigned to user"""

    def __init__(self, task_id: uuid.UUID, assigned_to_id: uuid.UUID, assigned_by_id: uuid.UUID):
        super().__init__(
            aggregate_id=task_id,
            event_data={
                "assigned_to_id": str(assigned_to_id),
                "assigned_by_id": str(assigned_by_id),
            }
        )


@dataclass
class TaskStartedEvent(DomainEvent):
    """Emitted when task work begins"""

    def __init__(self, task_id: uuid.UUID, started_by_id: uuid.UUID):
        super().__init__(
            aggregate_id=task_id,
            event_data={
                "started_by_id": str(started_by_id),
            }
        )


@dataclass
class TaskCompletedEvent(DomainEvent):
    """Emitted when task is completed"""

    def __init__(self, task_id: uuid.UUID, completed_by_id: uuid.UUID):
        super().__init__(
            aggregate_id=task_id,
            event_data={
                "completed_by_id": str(completed_by_id),
            }
        )


@dataclass
class TaskClosedEvent(DomainEvent):
    """Emitted when task is closed"""

    def __init__(self, task_id: uuid.UUID, closed_by_id: uuid.UUID):
        super().__init__(
            aggregate_id=task_id,
            event_data={
                "closed_by_id": str(closed_by_id),
            }
        )


@dataclass
class TaskStatusChangedEvent(DomainEvent):
    """Emitted when task status changes"""

    def __init__(self, task_id: uuid.UUID, old_status: str, new_status: str, changed_by_id: uuid.UUID):
        super().__init__(
            aggregate_id=task_id,
            event_data={
                "old_status": old_status,
                "new_status": new_status,
                "changed_by_id": str(changed_by_id),
            }
        )


@dataclass
class CommentAddedEvent(DomainEvent):
    """Emitted when comment is added to task"""

    def __init__(self, task_id: uuid.UUID, comment_id: uuid.UUID, author_id: uuid.UUID, is_internal: bool):
        super().__init__(
            aggregate_id=task_id,
            event_data={
                "comment_id": str(comment_id),
                "author_id": str(author_id),
                "is_internal": is_internal,
            }
        )


@dataclass
class AttachmentAddedEvent(DomainEvent):
    """Emitted when attachment is added to task"""

    def __init__(self, task_id: uuid.UUID, attachment_id: uuid.UUID, uploaded_by_id: uuid.UUID, filename: str):
        super().__init__(
            aggregate_id=task_id,
            event_data={
                "attachment_id": str(attachment_id),
                "uploaded_by_id": str(uploaded_by_id),
                "filename": filename,
            }
        )


@dataclass
class SLABreachedEvent(DomainEvent):
    """Emitted when task SLA is breached"""

    def __init__(self, task_id: uuid.UUID, sla_hours: int, elapsed_hours: float):
        super().__init__(
            aggregate_id=task_id,
            event_data={
                "sla_hours": sla_hours,
                "elapsed_hours": elapsed_hours,
            }
        )


@dataclass
class UserRoleAssignedEvent(DomainEvent):
    """Emitted when role is assigned to user"""

    def __init__(self, user_id: uuid.UUID, role_name: str, assigned_by_id: uuid.UUID):
        super().__init__(
            aggregate_id=user_id,
            event_data={
                "role_name": role_name,
                "assigned_by_id": str(assigned_by_id),
            }
        )


@dataclass
class UserRoleRevokedEvent(DomainEvent):
    """Emitted when role is revoked from user"""

    def __init__(self, user_id: uuid.UUID, role_name: str, revoked_by_id: uuid.UUID):
        super().__init__(
            aggregate_id=user_id,
            event_data={
                "role_name": role_name,
                "revoked_by_id": str(revoked_by_id),
            }
        )


class EventDispatcher:
    """
    Simple event dispatcher for domain events.
    In a real application, this would integrate with a message broker.
    """

    def __init__(self):
        self._handlers: Dict[str, list] = {}

    def register_handler(self, event_type: str, handler):
        """Register event handler"""
        if event_type not in self._handlers:
            self._handlers[event_type] = []
        self._handlers[event_type].append(handler)

    def dispatch(self, event: DomainEvent):
        """Dispatch event to registered handlers"""
        event_type = event.event_type
        if event_type in self._handlers:
            for handler in self._handlers[event_type]:
                try:
                    handler(event)
                except Exception as e:
                    # Log error but don't stop processing
                    print(f"Error handling event {event_type}: {e}")

    def dispatch_many(self, events: list[DomainEvent]):
        """Dispatch multiple events"""
        for event in events:
            self.dispatch(event)


# Global event dispatcher instance
event_dispatcher = EventDispatcher()
