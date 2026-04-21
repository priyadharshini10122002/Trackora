"""
Task repository implementation.
"""

from datetime import timedelta
from typing import List, Optional
from uuid import UUID

from django.db.models import Q, QuerySet
from django.utils import timezone

from apps.tasks.models import Task, TaskHistory, Assignment
from domain.value_objects.enums import TaskStatus
from infrastructure.repositories.base_repository import DjangoBaseRepository


class TaskRepository(DjangoBaseRepository[Task]):
    """
    Repository for Task entities with domain-specific queries.
    """

    def __init__(self):
        super().__init__(Task)

    def get_all(self) -> List[Task]:
        return list(
            Task.objects.select_related('created_by', 'assigned_to').all()
        )

    def get_by_id(self, id: UUID) -> Optional[Task]:
        try:
            return Task.objects.select_related('created_by', 'assigned_to').get(id=id)
        except Task.DoesNotExist:
            return None

    def get_by_status(self, status: TaskStatus | str) -> List[Task]:
        status_value = status.value if isinstance(status, TaskStatus) else status
        return list(
            Task.objects.select_related('created_by', 'assigned_to').filter(status=status_value)
        )

    def get_by_creator(self, user_id: UUID) -> List[Task]:
        return list(
            Task.objects.select_related('created_by', 'assigned_to').filter(created_by_id=user_id)
        )

    def get_by_assignee(self, user_id: UUID) -> List[Task]:
        return list(
            Task.objects.select_related('created_by', 'assigned_to').filter(assigned_to_id=user_id)
        )

    def get_accessible_tasks(self, user_id: UUID, is_manager_or_admin: bool) -> List[Task]:
        queryset = Task.objects.select_related('created_by', 'assigned_to')
        if is_manager_or_admin:
            return list(queryset.all())
        return list(queryset.filter(Q(created_by_id=user_id) | Q(assigned_to_id=user_id)))

    def get_due_within_hours(self, hours: int) -> List[Task]:
        now = timezone.now()
        upper_bound = now + timedelta(hours=hours)
        return list(
            Task.objects.select_related('created_by', 'assigned_to').filter(
                due_date__gte=now,
                due_date__lte=upper_bound,
                is_deleted=False,
            )
        )

    def get_overdue_active(self) -> List[Task]:
        return list(
            Task.objects.select_related('created_by', 'assigned_to').filter(
                due_date__lt=timezone.now(),
                status__in=[TaskStatus.APPROVED.value, TaskStatus.IN_PROGRESS.value],
                is_deleted=False,
            )
        )

    def soft_delete(self, task_id: UUID, deleted_by_id: UUID) -> bool:
        updated = Task.all_objects.filter(id=task_id, is_deleted=False).update(
            is_deleted=True,
            deleted_at=timezone.now(),
            deleted_by_id=deleted_by_id,
            updated_at=timezone.now(),
        )
        return updated > 0

    def restore(self, task_id: UUID) -> bool:
        updated = Task.all_objects.filter(id=task_id, is_deleted=True).update(
            is_deleted=False,
            deleted_at=None,
            deleted_by_id=None,
            updated_at=timezone.now(),
        )
        return updated > 0

    def create_history(
        self,
        task_id: UUID,
        changed_by_id: UUID,
        old_status: str,
        new_status: str,
        reason: str = "",
        metadata: Optional[dict] = None,
    ) -> TaskHistory:
        return TaskHistory.objects.create(
            task_id=task_id,
            old_status=old_status,
            new_status=new_status,
            changed_by_id=changed_by_id,
            reason=reason,
            metadata=metadata or {},
        )

    def create_assignment(
        self,
        task_id: UUID,
        assigned_to_id: UUID,
        assigned_by_id: UUID,
        notes: str = "",
    ) -> Assignment:
        return Assignment.objects.create(
            task_id=task_id,
            assigned_to_id=assigned_to_id,
            assigned_by_id=assigned_by_id,
            notes=notes,
        )

