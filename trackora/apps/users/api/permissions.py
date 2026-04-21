"""
Custom permissions for User management API.
"""

from rest_framework.permissions import BasePermission


class IsAdmin(BasePermission):
    """
    Permission for admin-only actions.
    """

    def has_permission(self, request, view):
        if not request.user.is_authenticated:
            return False
        return request.user.has_role('ADMIN')


class IsManager(BasePermission):
    """
    Permission for manager-level actions.
    """

    def has_permission(self, request, view):
        if not request.user.is_authenticated:
            return False
        return request.user.has_role('MANAGER') or request.user.has_role('ADMIN')


class CanManageUsers(BasePermission):
    """
    Permission to manage users.
    Only ADMIN and MANAGER can manage users.
    """

    def has_permission(self, request, view):
        if not request.user.is_authenticated:
            return False
        return request.user.has_role('ADMIN') or request.user.has_role('MANAGER')


class CanAssignRoles(BasePermission):
    """
    Permission to assign/revoke user roles.
    Only ADMIN can assign roles.
    """

    def has_permission(self, request, view):
        if not request.user.is_authenticated:
            return False
        return request.user.has_role('ADMIN')

    def has_object_permission(self, request, view, obj):
        """Check object-level permissions for role management"""
        # Users cannot modify their own roles (except through admin)
        if obj.user == request.user and not request.user.has_role('ADMIN'):
            return False
        return self.has_permission(request, view)
