"""
API views for Trackora tasks app.
"""

from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from rest_framework.exceptions import ValidationError, PermissionDenied
from django_filters.rest_framework import DjangoFilterBackend
from rest_framework.filters import SearchFilter, OrderingFilter
from django.db.models import Q

from apps.tasks.models import Task, TaskHistory, Comment, Attachment, Assignment
from infrastructure.cache.cache_service import CacheService
from apps.tasks.api.serializers import (
    TaskCreateSerializer,
    TaskDetailSerializer,
    TaskListSerializer,
    TaskUpdateSerializer,
    TaskHistorySerializer,
    CommentSerializer,
    AttachmentSerializer,
    TaskAssignmentSerializer,
)
from apps.tasks.api.permissions import (
    CanCreateTask,
    CanViewTask,
    CanEditTask,
    CanApproveTask,
    CanAssignTask,
    CanCloseTask,
    CanAddComments,
    CanAddAttachments,
    CanViewTaskHistory,
)
from apps.tasks.usecases import (
    ApproveTaskUseCase,
    AssignTaskRequest,
    AssignTaskUseCase,
    CloseTaskUseCase,
    CompleteTaskUseCase,
    RejectTaskUseCase,
    StartTaskUseCase,
    SubmitForApprovalUseCase,
    WorkflowRequest,
)
from domain.events.domain_events import (
    AttachmentAddedEvent,
    CommentAddedEvent,
    TaskCreatedEvent,
    event_dispatcher,
)
from domain.value_objects.enums import TaskStatus, UserRole


class TaskViewSet(viewsets.ModelViewSet):
    """
    ViewSet for Task management.

    Provides CRUD operations and workflow actions.
    """
    queryset = Task.objects.select_related('created_by', 'assigned_to').all()
    filter_backends = [DjangoFilterBackend, SearchFilter, OrderingFilter]
    filterset_fields = ['status', 'priority', 'assigned_to', 'created_by']
    search_fields = ['title', 'description']
    ordering_fields = ['created_at', 'due_date', 'priority', 'status']
    ordering = ['-created_at']

    def get_serializer_class(self):
        if self.action == 'create':
            return TaskCreateSerializer
        elif self.action == 'list':
            return TaskListSerializer
        elif self.action in ['update', 'partial_update']:
            return TaskUpdateSerializer
        else:
            return TaskDetailSerializer

    def get_permissions(self):
        if self.action == 'create':
            permission_classes = [IsAuthenticated, CanCreateTask]
        elif self.action in ['update', 'partial_update']:
            permission_classes = [IsAuthenticated, CanEditTask]
        else:
            permission_classes = [IsAuthenticated, CanViewTask]
        return [permission() for permission in permission_classes]

    def perform_create(self, serializer):
        """Create task with current user as creator, emit TaskCreatedEvent."""
        task = serializer.save(created_by=self.request.user)
        _invalidate_task_related_cache(task)
        event_dispatcher.dispatch(
            TaskCreatedEvent(
                task_id=task.id,
                created_by_id=self.request.user.id,
                title=task.title,
            )
        )

    def get_queryset(self):
        """Filter tasks based on role-aware visibility."""
        queryset = super().get_queryset()
        user = self.request.user
        role_names = user.get_role_names()
        if any(role in [UserRole.ADMIN.value, UserRole.MANAGER.value] for role in role_names):
            return queryset
        return queryset.filter(Q(created_by=user) | Q(assigned_to=user))

    # ----------------------------------------------------------- Workflow actions
    #
    # Each workflow action is a thin adapter: build a use-case request from
    # the HTTP request, execute the use case, and return the refreshed task.
    # All state validation, prerequisite checking, history writing, cache
    # invalidation and event dispatch live inside the use case, so this HTTP
    # layer stays a translator between JSON and domain calls.

    @action(detail=True, methods=['post'], permission_classes=[IsAuthenticated, CanApproveTask])
    def submit_for_approval(self, request, pk=None):
        """Submit task for approval (DRAFT -> PENDING_APPROVAL)."""
        task = self.get_object()
        SubmitForApprovalUseCase().execute(
            WorkflowRequest(
                task_id=task.id,
                actor_id=request.user.id,
                actor_role=self._get_user_role(),
                reason=request.data.get('reason', ''),
            )
        )
        task.refresh_from_db()
        return Response(self.get_serializer(task).data)

    @action(detail=True, methods=['post'], permission_classes=[IsAuthenticated, CanApproveTask])
    def approve(self, request, pk=None):
        """Approve a task (PENDING_APPROVAL -> APPROVED)."""
        task = self.get_object()
        ApproveTaskUseCase().execute(
            WorkflowRequest(
                task_id=task.id,
                actor_id=request.user.id,
                actor_role=self._get_user_role(),
                reason=request.data.get('reason', ''),
            )
        )
        task.refresh_from_db()
        return Response(self.get_serializer(task).data)

    @action(detail=True, methods=['post'], permission_classes=[IsAuthenticated, CanApproveTask])
    def reject(self, request, pk=None):
        """Reject a task (PENDING_APPROVAL -> DRAFT)."""
        task = self.get_object()
        RejectTaskUseCase().execute(
            WorkflowRequest(
                task_id=task.id,
                actor_id=request.user.id,
                actor_role=self._get_user_role(),
                reason=request.data.get('reason', ''),
            )
        )
        task.refresh_from_db()
        return Response(self.get_serializer(task).data)

    @action(detail=True, methods=['post'], permission_classes=[IsAuthenticated, CanAssignTask])
    def assign(self, request, pk=None):
        """Assign task to user."""
        task = self.get_object()
        serializer = TaskAssignmentSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        AssignTaskUseCase().execute(
            AssignTaskRequest(
                task_id=task.id,
                assigned_to_id=serializer.validated_data['assigned_to_id'],
                assigned_by_id=request.user.id,
                actor_role=self._get_user_role(),
                notes=serializer.validated_data.get('notes', ''),
            )
        )
        task.refresh_from_db()
        return Response(self.get_serializer(task).data)

    @action(detail=True, methods=['post'], permission_classes=[IsAuthenticated, CanEditTask])
    def start(self, request, pk=None):
        """Start working on task (APPROVED -> IN_PROGRESS)."""
        task = self.get_object()
        StartTaskUseCase().execute(
            WorkflowRequest(
                task_id=task.id,
                actor_id=request.user.id,
                actor_role=self._get_user_role(),
                reason=request.data.get('reason', ''),
            )
        )
        task.refresh_from_db()
        return Response(self.get_serializer(task).data)

    @action(detail=True, methods=['post'], permission_classes=[IsAuthenticated, CanEditTask])
    def complete(self, request, pk=None):
        """Mark task as completed (IN_PROGRESS -> COMPLETED)."""
        task = self.get_object()
        CompleteTaskUseCase().execute(
            WorkflowRequest(
                task_id=task.id,
                actor_id=request.user.id,
                actor_role=self._get_user_role(),
                reason=request.data.get('reason', ''),
            )
        )
        task.refresh_from_db()
        return Response(self.get_serializer(task).data)

    @action(detail=True, methods=['post'], permission_classes=[IsAuthenticated, CanCloseTask])
    def close(self, request, pk=None):
        """Close a completed task (COMPLETED -> CLOSED)."""
        task = self.get_object()
        CloseTaskUseCase().execute(
            WorkflowRequest(
                task_id=task.id,
                actor_id=request.user.id,
                actor_role=self._get_user_role(),
                reason=request.data.get('reason', ''),
            )
        )
        task.refresh_from_db()
        return Response(self.get_serializer(task).data)

    @action(detail=True, methods=['get'], permission_classes=[IsAuthenticated, CanViewTaskHistory])
    def history(self, request, pk=None):
        """Get task history"""
        task = self.get_object()
        history = task.history.order_by('-timestamp')
        serializer = TaskHistorySerializer(history, many=True)
        return Response(serializer.data)

    @action(detail=False, methods=['get'], permission_classes=[IsAuthenticated])
    def stats(self, request):
        """Get cached task statistics for current user."""
        user = request.user
        role_names = user.get_role_names()
        user_id_for_cache = None if any(
            role in [UserRole.ADMIN.value, UserRole.MANAGER.value] for role in role_names
        ) else user.id

        cached = CacheService.get_task_stats(user_id=user_id_for_cache)
        if cached:
            return Response(cached)

        queryset = self.get_queryset()
        stats = {
            "total": queryset.count(),
            "draft": queryset.filter(status=TaskStatus.DRAFT.value).count(),
            "pending_approval": queryset.filter(status=TaskStatus.PENDING_APPROVAL.value).count(),
            "approved": queryset.filter(status=TaskStatus.APPROVED.value).count(),
            "in_progress": queryset.filter(status=TaskStatus.IN_PROGRESS.value).count(),
            "completed": queryset.filter(status=TaskStatus.COMPLETED.value).count(),
            "closed": queryset.filter(status=TaskStatus.CLOSED.value).count(),
        }
        CacheService.set_task_stats(stats=stats, user_id=user_id_for_cache)
        return Response(stats)

    def _get_user_role(self):
        """Get user's highest role for workflow validation"""
        role_names = self.request.user.get_role_names()

        if UserRole.ADMIN.value in role_names:
            return UserRole.ADMIN
        elif UserRole.MANAGER.value in role_names:
            return UserRole.MANAGER
        elif UserRole.CONTRIBUTOR.value in role_names:
            return UserRole.CONTRIBUTOR
        else:
            return UserRole.VIEWER


class CommentViewSet(viewsets.ModelViewSet):
    """
    ViewSet for Task comments.
    """
    serializer_class = CommentSerializer
    permission_classes = [IsAuthenticated, CanAddComments]

    def get_queryset(self):
        user = self.request.user
        role_names = user.get_role_names()
        queryset = Comment.objects.select_related('task', 'author').all()
        is_elevated = any(role in [UserRole.ADMIN.value, UserRole.MANAGER.value] for role in role_names)
        if not is_elevated:
            queryset = queryset.filter(
                Q(task__created_by=user) | Q(task__assigned_to=user)
            )
            queryset = queryset.filter(is_internal=False)
        task_id = self.request.query_params.get('task')
        if task_id:
            queryset = queryset.filter(task_id=task_id)
        return queryset

    def get_permissions(self):
        return [IsAuthenticated(), CanAddComments()]

    def perform_create(self, serializer):
        task = serializer.validated_data.get('task')
        if task is None:
            raise ValidationError({'task': 'Task ID is required.'})
        if serializer.validated_data.get('is_internal', False):
            role_names = self.request.user.get_role_names()
            if not any(role in [UserRole.ADMIN.value, UserRole.MANAGER.value] for role in role_names):
                raise PermissionDenied('Only managers or admins can create internal comments.')
        if not _can_access_task(self.request.user, task):
            raise PermissionDenied('You do not have permission to comment on this task.')
        comment = serializer.save(task=task, author=self.request.user)
        event_dispatcher.dispatch(
            CommentAddedEvent(
                task_id=task.id,
                comment_id=comment.id,
                author_id=self.request.user.id,
                is_internal=comment.is_internal,
            )
        )


class AttachmentViewSet(viewsets.ModelViewSet):
    """
    ViewSet for Task attachments.
    """
    serializer_class = AttachmentSerializer
    permission_classes = [IsAuthenticated, CanAddAttachments]

    def get_queryset(self):
        user = self.request.user
        role_names = user.get_role_names()
        queryset = Attachment.objects.select_related('task', 'uploaded_by').all()
        if not any(role in [UserRole.ADMIN.value, UserRole.MANAGER.value] for role in role_names):
            queryset = queryset.filter(
                Q(task__created_by=user) | Q(task__assigned_to=user)
            )
        task_id = self.request.query_params.get('task')
        if task_id:
            queryset = queryset.filter(task_id=task_id)
        return queryset

    def perform_create(self, serializer):
        task = serializer.validated_data.get('task')
        if task is None:
            raise ValidationError({'task': 'Task ID is required.'})
        if not _can_access_task(self.request.user, task):
            raise PermissionDenied('You do not have permission to upload attachments for this task.')
        attachment = serializer.save(task=task, uploaded_by=self.request.user)
        event_dispatcher.dispatch(
            AttachmentAddedEvent(
                task_id=task.id,
                attachment_id=attachment.id,
                uploaded_by_id=self.request.user.id,
                filename=getattr(attachment, 'filename', '') or getattr(attachment.file, 'name', ''),
            )
        )


def _can_access_task(user, task):
    role_names = user.get_role_names()
    if any(role in [UserRole.ADMIN.value, UserRole.MANAGER.value] for role in role_names):
        return True
    if task.created_by_id == user.id:
        return True
    if task.assigned_to_id == user.id:
        return True
    return False


def _invalidate_task_related_cache(task):
    CacheService.invalidate_task_detail(task.id)
    CacheService.invalidate_task_stats()
    CacheService.invalidate_task_stats(user_id=task.created_by_id)
    if task.assigned_to_id:
        CacheService.invalidate_task_stats(user_id=task.assigned_to_id)

