"""
Domain value objects for Trackora.
Immutable objects representing domain concepts.
"""

from enum import Enum
from typing import List


class TaskStatus(str, Enum):
    """Task status enumeration"""
    DRAFT = 'DRAFT'
    PENDING_APPROVAL = 'PENDING_APPROVAL'
    APPROVED = 'APPROVED'
    IN_PROGRESS = 'IN_PROGRESS'
    COMPLETED = 'COMPLETED'
    CLOSED = 'CLOSED'
    
    @classmethod
    def choices(cls):
        return [(status.value, status.name.replace('_', ' ').title()) for status in cls]


class TaskPriority(str, Enum):
    """Task priority enumeration"""
    LOW = 'LOW'
    MEDIUM = 'MEDIUM'
    HIGH = 'HIGH'
    CRITICAL = 'CRITICAL'
    
    @classmethod
    def choices(cls):
        return [(priority.value, priority.name.title()) for priority in cls]
    
    @classmethod
    def get_weight(cls, priority: 'TaskPriority') -> int:
        """Get numeric weight for priority (for sorting)"""
        weights = {
            cls.LOW: 1,
            cls.MEDIUM: 2,
            cls.HIGH: 3,
            cls.CRITICAL: 4,
        }
        return weights.get(priority, 0)


class UserRole(str, Enum):
    """User role enumeration"""
    ADMIN = 'ADMIN'
    MANAGER = 'MANAGER'
    CONTRIBUTOR = 'CONTRIBUTOR'
    VIEWER = 'VIEWER'
    
    @classmethod
    def choices(cls):
        return [(role.value, role.name.title()) for role in cls]
    
    @classmethod
    def get_hierarchy_level(cls, role: 'UserRole') -> int:
        """Get hierarchy level (higher number = more authority)"""
        levels = {
            cls.VIEWER: 1,
            cls.CONTRIBUTOR: 2,
            cls.MANAGER: 3,
            cls.ADMIN: 4,
        }
        return levels.get(role, 0)
    
    def can_perform(self, required_roles: List['UserRole']) -> bool:
        """Check if this role can perform action requiring any of the specified roles"""
        return self in required_roles


class CommentVisibility(str, Enum):
    """Comment visibility enumeration"""
    PUBLIC = 'PUBLIC'
    INTERNAL = 'INTERNAL'
    
    @classmethod
    def choices(cls):
        return [(visibility.value, visibility.name.title()) for visibility in cls]
