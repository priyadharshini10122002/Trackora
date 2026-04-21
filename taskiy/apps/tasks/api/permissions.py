"""
Custom permissions for Trackora tasks API.
"""

from rest_framework.permissions import BasePermission
from domain.value_objects.enums import UserRole


class CanCreateTask(BasePermission):
    """
    Permission to create tasks.
    Only MANAGER and ADMIN can create tasks.
    """

    def has_permission(self, request, view):
        if not request.user.is_authenticated:
            return False

        user_roles = request.user.get_role_names()
        return any(role in [UserRole.MANAGER.value, UserRole.ADMIN.value] for role in user_roles)


class CanViewTask(BasePermission):
    """
    Permission to view tasks.
    - Creator can view their own tasks
    - Assigned user can view assigned tasks
    - MANAGER/ADMIN can view all tasks
    """

    def has_permission(self, request, view):
        return bool(request.user and request.user.is_authenticated)

    def has_object_permission(self, request, view, obj):
        if not request.user.is_authenticated:
            return False

        user_roles = request.user.get_role_names()

        # Admin and Manager can view all tasks
        if any(role in [UserRole.ADMIN.value, UserRole.MANAGER.value] for role in user_roles):
            return True

        # Creator can view their own tasks
        if obj.created_by == request.user:
            return True

        # Assigned user can view assigned tasks
        if obj.assigned_to == request.user:
            return True

        return False


class CanEditTask(BasePermission):
    """
    Permission to edit tasks.
    - Creator can edit their own tasks (if in draft)
    - Assigned user can edit assigned tasks (if in progress)
    - MANAGER/ADMIN can edit any task
    """

    def has_permission(self, request, view):
        return bool(request.user and request.user.is_authenticated)

    def has_object_permission(self, request, view, obj):
        if not request.user.is_authenticated:
            return False

        user_roles = request.user.get_role_names()

        # Admin and Manager can edit all tasks
        if any(role in [UserRole.ADMIN.value, UserRole.MANAGER.value] for role in user_roles):
            return True

        # Creator can edit their own draft tasks
        if obj.created_by == request.user and obj.status == 'DRAFT':
            return True

        # Assigned user can edit tasks in progress
        if obj.assigned_to == request.user and obj.status == 'IN_PROGRESS':
            return True

        return False


class CanApproveTask(BasePermission):
    """
    Permission to approve/reject tasks.
    Only MANAGER and ADMIN can approve tasks.
    """

    def has_permission(self, request, view):
        if not request.user.is_authenticated:
            return False

        user_roles = request.user.get_role_names()
        return any(role in [UserRole.MANAGER.value, UserRole.ADMIN.value] for role in user_roles)

    def has_object_permission(self, request, view, obj):
        return self.has_permission(request, view)


class CanAssignTask(BasePermission):
    """
    Permission to assign tasks.
    Only MANAGER and ADMIN can assign tasks.
    """

    def has_permission(self, request, view):
        if not request.user.is_authenticated:
            return False

        user_roles = request.user.get_role_names()
        return any(role in [UserRole.MANAGER.value, UserRole.ADMIN.value] for role in user_roles)

    def has_object_permission(self, request, view, obj):
        return self.has_permission(request, view)


class CanCloseTask(BasePermission):
    """
    Permission to close tasks.
    Only MANAGER and ADMIN can close tasks.
    """

    def has_permission(self, request, view):
        if not request.user.is_authenticated:
            return False

        user_roles = request.user.get_role_names()
        return any(role in [UserRole.MANAGER.value, UserRole.ADMIN.value] for role in user_roles)

    def has_object_permission(self, request, view, obj):
        return self.has_permission(request, view)


class CanViewInternalComments(BasePermission):
    """
    Permission to view internal comments.
    Only MANAGER and ADMIN can view internal comments.
    """

    def has_permission(self, request, view):
        if not request.user.is_authenticated:
            return False

        user_roles = request.user.get_role_names()
        return any(role in [UserRole.MANAGER.value, UserRole.ADMIN.value] for role in user_roles)


class CanAddComments(BasePermission):
    """
    Permission to add comments.
    - Creator can comment on their own tasks
    - Assigned user can comment on assigned tasks
    - MANAGER/ADMIN can comment on any task
    """

    def has_permission(self, request, view):
        return bool(request.user and request.user.is_authenticated)

    def has_object_permission(self, request, view, obj):
        task = obj.task if hasattr(obj, 'task') else obj
        return _can_access_task(request, task)


class CanAddAttachments(BasePermission):
    """
    Permission to add attachments.
    - Creator can add attachments to their own tasks
    - Assigned user can add attachments to assigned tasks
    - MANAGER/ADMIN can add attachments to any task
    """

    def has_permission(self, request, view):
        return bool(request.user and request.user.is_authenticated)

    def has_object_permission(self, request, view, obj):
        task = obj.task if hasattr(obj, 'task') else obj
        return _can_access_task(request, task)


class CanViewTaskHistory(BasePermission):
    """
    Permission to view task history.
    - Creator can view history of their own tasks
    - Assigned user can view history of assigned tasks
    - MANAGER/ADMIN can view history of any task
    """

    def has_permission(self, request, view):
        return bool(request.user and request.user.is_authenticated)

    def has_object_permission(self, request, view, obj):
        return _can_access_task(request, obj)


def _can_access_task(request, task):
    if not request.user.is_authenticated:
        return False
    user_roles = request.user.get_role_names()
    if any(role in [UserRole.ADMIN.value, UserRole.MANAGER.value] for role in user_roles):
        return True
    if task.created_by == request.user:
        return True
    if task.assigned_to == request.user:
        return True
    return False
