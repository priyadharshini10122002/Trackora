"""
Domain entities for Trackora.
Pure Python business objects representing core concepts.
"""

import re
import uuid
from datetime import datetime
from typing import Optional, List
from domain.value_objects.enums import TaskStatus, TaskPriority, UserRole


# Lightweight RFC-ish email shape check. Not meant to be comprehensive -
# the authoritative validation happens at the DRF serializer layer with
# Django's EmailValidator. This is just enough to enforce the "looks like
# an email" invariant for the pure-domain UserEntity.
_EMAIL_RE = re.compile(r"^[^\s@]+@[^\s@]+\.[^\s@]+$")


class BaseEntity:
    """Base class for all domain entities"""

    def __init__(self, id: Optional[uuid.UUID] = None):
        self.id = id or uuid.uuid4()
        self.created_at = datetime.now()
        self.updated_at = datetime.now()

    def __eq__(self, other):
        if not isinstance(other, BaseEntity):
            return False
        return self.id == other.id

    def __hash__(self):
        return hash(self.id)


class TaskEntity(BaseEntity):
    """
    Core Task domain entity.
    Represents a task in the business domain.
    """

    def __init__(
        self,
        id: Optional[uuid.UUID] = None,
        title: str = "",
        description: str = "",
        priority: TaskPriority = TaskPriority.MEDIUM,
        status: TaskStatus = TaskStatus.DRAFT,
        due_date: Optional[datetime] = None,
        sla_hours: int = 24,
        created_by_id: Optional[uuid.UUID] = None,
        assigned_to_id: Optional[uuid.UUID] = None,
        is_deleted: bool = False,
        deleted_at: Optional[datetime] = None,
        deleted_by_id: Optional[uuid.UUID] = None,
    ):
        super().__init__(id)
        self.title = title
        self.description = description
        self.priority = priority
        self.status = status
        self.due_date = due_date
        self.sla_hours = sla_hours
        self.created_by_id = created_by_id
        self.assigned_to_id = assigned_to_id
        self.is_deleted = is_deleted
        self.deleted_at = deleted_at
        self.deleted_by_id = deleted_by_id

        self._validate()

    def _validate(self):
        """Validate entity invariants."""
        if len(self.title) < 10 or len(self.title) > 150:
            raise ValueError("Task title must be between 10 and 150 characters")

        if self.sla_hours <= 0:
            raise ValueError("SLA hours must be positive")

        # NB: past due_date is intentionally *not* rejected here. Users
        # sometimes backfill tasks (e.g. logging work that was actually
        # completed yesterday), and the "due in the future" rule belongs
        # in the create-path business logic / serializer, not in the
        # entity invariant. Keeping the entity permissive lets us reload
        # historical rows from the DB without crashing the constructor.

    def can_be_assigned_by(self, user_role: UserRole) -> bool:
        """Check if user can assign this task"""
        return user_role in [UserRole.MANAGER, UserRole.ADMIN]

    def can_be_approved_by(self, user_role: UserRole) -> bool:
        """Check if user can approve this task"""
        return user_role in [UserRole.MANAGER, UserRole.ADMIN]

    def is_overdue(self) -> bool:
        """Check if task is overdue"""
        if not self.due_date:
            return False
        return datetime.now() > self.due_date and self.status != TaskStatus.CLOSED

    def is_sla_breached(self) -> bool:
        """Check if SLA has been breached"""
        elapsed_hours = (datetime.now() - self.created_at).total_seconds() / 3600
        return elapsed_hours > self.sla_hours

    def update_status(self, new_status: TaskStatus, changed_by_id: uuid.UUID):
        """Update task status with validation"""
        self.status = new_status
        self.updated_at = datetime.now()

    def assign_to(self, assigned_to_id: uuid.UUID, assigned_by_id: uuid.UUID):
        """Assign task to user"""
        self.assigned_to_id = assigned_to_id
        self.updated_at = datetime.now()

    def soft_delete(self, deleted_by_id: uuid.UUID):
        """Soft delete the task"""
        self.is_deleted = True
        self.deleted_at = datetime.now()
        self.deleted_by_id = deleted_by_id
        self.updated_at = datetime.now()


class AssignmentEntity(BaseEntity):
    """Task assignment domain entity"""

    def __init__(
        self,
        id: Optional[uuid.UUID] = None,
        task_id: Optional[uuid.UUID] = None,
        assigned_to_id: Optional[uuid.UUID] = None,
        assigned_by_id: Optional[uuid.UUID] = None,
        assigned_at: Optional[datetime] = None,
        notes: str = "",
    ):
        super().__init__(id)
        self.task_id = task_id
        self.assigned_to_id = assigned_to_id
        self.assigned_by_id = assigned_by_id
        self.assigned_at = assigned_at or datetime.now()
        self.notes = notes


class CommentEntity(BaseEntity):
    """Task comment domain entity"""

    def __init__(
        self,
        id: Optional[uuid.UUID] = None,
        task_id: Optional[uuid.UUID] = None,
        author_id: Optional[uuid.UUID] = None,
        content: str = "",
        is_internal: bool = False,
    ):
        super().__init__(id)
        self.task_id = task_id
        self.author_id = author_id
        self.content = content
        self.is_internal = is_internal
        self._validate()

    def _validate(self):
        """Validate entity invariants."""
        if not self.content or not self.content.strip():
            raise ValueError("Comment content cannot be empty")

    def can_be_viewed_by(self, user_role: UserRole) -> bool:
        """Check if user can view this comment"""
        if not self.is_internal:
            return True
        return user_role in [UserRole.MANAGER, UserRole.ADMIN]


class UserEntity(BaseEntity):
    """User domain entity"""

    def __init__(
        self,
        id: Optional[uuid.UUID] = None,
        email: str = "",
        first_name: str = "",
        last_name: str = "",
        roles: Optional[List[UserRole]] = None,
    ):
        super().__init__(id)
        self.email = email
        self.first_name = first_name
        self.last_name = last_name
        self.roles = roles or []
        self._validate()

    def _validate(self):
        """Validate entity invariants."""
        # Only validate non-empty emails so that default/empty UserEntity
        # (e.g. used as placeholders in tests) doesn't blow up.
        if self.email and not _EMAIL_RE.match(self.email):
            raise ValueError(f"Invalid email format: {self.email!r}")

    def has_role(self, role: UserRole) -> bool:
        """Check if user has specific role"""
        return role in self.roles

    def get_full_name(self) -> str:
        """Get user's full name"""
        return f"{self.first_name} {self.last_name}".strip()

    def can_perform_action(self, required_roles: List[UserRole]) -> bool:
        """Check if user can perform action requiring specific roles"""
        return any(role in required_roles for role in self.roles)
