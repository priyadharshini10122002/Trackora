"""
Infrastructure repositories package.
"""

from infrastructure.repositories.base_repository import BaseRepository, DjangoBaseRepository
from infrastructure.repositories.user_repository import UserRepository, RoleRepository
from infrastructure.repositories.task_repository import TaskRepository
from infrastructure.repositories.interfaces import (
    UserRepositoryInterface,
    TaskRepositoryInterface,
)

__all__ = [
    "BaseRepository",
    "DjangoBaseRepository",
    "UserRepository",
    "RoleRepository",
    "TaskRepository",
    "UserRepositoryInterface",
    "TaskRepositoryInterface",
]
