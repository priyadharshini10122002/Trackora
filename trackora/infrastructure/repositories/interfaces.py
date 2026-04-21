"""
Repository protocol interfaces for dependency inversion.
"""

from typing import List, Optional, Protocol
from uuid import UUID

from apps.tasks.models import Task
from apps.users.models import User
from domain.value_objects.enums import TaskStatus


class UserRepositoryInterface(Protocol):
    def get_by_id(self, id: UUID) -> Optional[User]:
        ...

    def get_by_email(self, email: str) -> Optional[User]:
        ...

    def get_active_users(self) -> List[User]:
        ...


class TaskRepositoryInterface(Protocol):
    def get_by_id(self, id: UUID) -> Optional[Task]:
        ...

    def get_all(self) -> List[Task]:
        ...

    def get_by_status(self, status: TaskStatus | str) -> List[Task]:
        ...

    def get_by_creator(self, user_id: UUID) -> List[Task]:
        ...

    def get_by_assignee(self, user_id: UUID) -> List[Task]:
        ...

