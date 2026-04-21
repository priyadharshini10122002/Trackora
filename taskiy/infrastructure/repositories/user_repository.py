"""
User repository implementation.
"""

from typing import List, Optional
from uuid import UUID

from infrastructure.repositories.base_repository import DjangoBaseRepository
from apps.users.models import User, Role, UserRole
class UserRepository(DjangoBaseRepository[User]):
    """
    Repository for User entities.
    """

    def __init__(self):
        super().__init__(User)

    def get_by_email(self, email: str) -> Optional[User]:
        """Get user by email"""
        try:
            return User.objects.get(email=email)
        except User.DoesNotExist:
            return None

    def get_active_users(self) -> List[User]:
        """Get all active users"""
        return list(User.objects.filter(is_active=True))

    def get_users_by_role(self, role_name: str) -> List[User]:
        """Get users with specific role"""
        return list(User.objects.filter(
            user_roles__role__name=role_name,
            is_active=True
        ).distinct())

    def assign_role(self, user_id: UUID, role_id: UUID, assigned_by_id: UUID) -> UserRole:
        """Assign role to user"""
        user = self.get_by_id(user_id)
        role = Role.objects.get(id=role_id)

        user_role, created = UserRole.objects.get_or_create(
            user=user,
            role=role,
            defaults={'assigned_by_id': assigned_by_id}
        )

        return user_role

    def remove_role(self, user_id: UUID, role_id: UUID) -> None:
        """Remove role from user"""
        UserRole.objects.filter(
            user_id=user_id,
            role_id=role_id
        ).delete()

    def get_user_roles(self, user_id: UUID) -> List[Role]:
        """Get all roles for a user"""
        user = self.get_by_id(user_id)
        if not user:
            return []
        return [user_role.role for user_role in user.user_roles.select_related('role').all()]


class RoleRepository(DjangoBaseRepository[Role]):
    """
    Repository for Role entities.
    """

    def __init__(self):
        super().__init__(Role)

    def get_by_name(self, name: str) -> Optional[Role]:
        """Get role by name"""
        try:
            return Role.objects.get(name=name)
        except Role.DoesNotExist:
            return None

    def get_all_roles(self) -> List[Role]:
        """Get all roles"""
        return list(Role.objects.all().order_by('name'))
