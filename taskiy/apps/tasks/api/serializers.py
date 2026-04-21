"""
API serializers for Trackora tasks app.
"""

from rest_framework import serializers
from django.utils import timezone
from apps.tasks.models import Task, TaskHistory, Comment, Attachment, Assignment
from domain.value_objects.enums import TaskStatus, TaskPriority


class TaskCreateSerializer(serializers.ModelSerializer):
    """Serializer for creating new tasks"""

    class Meta:
        model = Task
        fields = [
            'title',
            'description',
            'priority',
            'due_date',
            'sla_hours',
        ]

    def validate_title(self, value):
        """Validate task title length"""
        if len(value) < 10 or len(value) > 150:
            raise serializers.ValidationError(
                "Task title must be between 10 and 150 characters."
            )
        return value

    def validate_due_date(self, value):
        """Validate due date is in future"""
        if value <= timezone.now():
            raise serializers.ValidationError(
                "Due date must be in the future."
            )
        return value

    def validate_sla_hours(self, value):
        """Validate SLA hours is positive"""
        if value <= 0:
            raise serializers.ValidationError(
                "SLA hours must be positive."
            )
        return value


class TaskDetailSerializer(serializers.ModelSerializer):
    """Detailed serializer for task representation"""

    created_by_name = serializers.CharField(
        source='created_by.get_full_name',
        read_only=True
    )
    assigned_to_name = serializers.CharField(
        source='assigned_to.get_full_name',
        read_only=True,
        allow_null=True
    )
    is_overdue = serializers.BooleanField(read_only=True)
    is_sla_breached = serializers.BooleanField(read_only=True)
    elapsed_hours = serializers.FloatField(read_only=True)

    class Meta:
        model = Task
        fields = [
            'id',
            'title',
            'description',
            'priority',
            'status',
            'due_date',
            'sla_hours',
            'created_by',
            'created_by_name',
            'assigned_to',
            'assigned_to_name',
            'is_deleted',
            'created_at',
            'updated_at',
            'is_overdue',
            'is_sla_breached',
            'elapsed_hours',
        ]
        read_only_fields = [
            'id',
            'created_by',
            'created_by_name',
            'is_deleted',
            'created_at',
            'updated_at',
            'is_overdue',
            'is_sla_breached',
            'elapsed_hours',
        ]


class TaskListSerializer(serializers.ModelSerializer):
    """Optimized serializer for task listing"""

    created_by_name = serializers.CharField(
        source='created_by.get_full_name',
        read_only=True
    )
    assigned_to_name = serializers.CharField(
        source='assigned_to.get_full_name',
        read_only=True,
        allow_null=True
    )

    class Meta:
        model = Task
        fields = [
            'id',
            'title',
            'priority',
            'status',
            'due_date',
            'created_by_name',
            'assigned_to_name',
            'created_at',
        ]


class TaskUpdateSerializer(serializers.ModelSerializer):
    """Serializer for partial task updates"""

    class Meta:
        model = Task
        fields = [
            'title',
            'description',
            'priority',
            'due_date',
            'sla_hours',
        ]
        extra_kwargs = {
            'title': {'required': False},
            'description': {'required': False},
            'priority': {'required': False},
            'due_date': {'required': False},
            'sla_hours': {'required': False},
        }

    def validate_title(self, value):
        """Validate task title length"""
        if len(value) < 10 or len(value) > 150:
            raise serializers.ValidationError(
                "Task title must be between 10 and 150 characters."
            )
        return value

    def validate_due_date(self, value):
        """Validate due date is in future"""
        if value <= timezone.now():
            raise serializers.ValidationError(
                "Due date must be in the future."
            )
        return value

    def validate_sla_hours(self, value):
        """Validate SLA hours is positive"""
        if value <= 0:
            raise serializers.ValidationError(
                "SLA hours must be positive."
            )
        return value


class TaskHistorySerializer(serializers.ModelSerializer):
    """Serializer for task history records"""

    changed_by_name = serializers.CharField(
        source='changed_by.get_full_name',
        read_only=True
    )

    class Meta:
        model = TaskHistory
        fields = [
            'id',
            'old_status',
            'new_status',
            'changed_by',
            'changed_by_name',
            'reason',
            'metadata',
            'timestamp',
        ]


class CommentSerializer(serializers.ModelSerializer):
    """Serializer for task comments"""

    author_name = serializers.CharField(
        source='author.get_full_name',
        read_only=True
    )

    class Meta:
        model = Comment
        fields = [
            'id',
            'task',
            'content',
            'is_internal',
            'author',
            'author_name',
            'created_at',
            'updated_at',
        ]
        read_only_fields = [
            'id',
            'author',
            'author_name',
            'created_at',
            'updated_at',
        ]

    def validate_content(self, value):
        """Validate comment content is not empty"""
        if not value.strip():
            raise serializers.ValidationError(
                "Comment content cannot be empty."
            )
        return value


class AttachmentSerializer(serializers.ModelSerializer):
    """Serializer for task attachments"""

    uploaded_by_name = serializers.CharField(
        source='uploaded_by.get_full_name',
        read_only=True
    )

    class Meta:
        model = Attachment
        fields = [
            'id',
            'task',
            'file',
            'filename',
            'file_size',
            'mime_type',
            'uploaded_by',
            'uploaded_by_name',
            'uploaded_at',
        ]
        read_only_fields = [
            'id',
            'filename',
            'file_size',
            'mime_type',
            'uploaded_by',
            'uploaded_by_name',
            'uploaded_at',
        ]


class AssignmentSerializer(serializers.ModelSerializer):
    """Serializer for task assignments"""

    assigned_to_name = serializers.CharField(
        source='assigned_to.get_full_name',
        read_only=True
    )
    assigned_by_name = serializers.CharField(
        source='assigned_by.get_full_name',
        read_only=True
    )

    class Meta:
        model = Assignment
        fields = [
            'id',
            'assigned_to',
            'assigned_to_name',
            'assigned_by',
            'assigned_by_name',
            'assigned_at',
            'notes',
        ]
        read_only_fields = [
            'id',
            'assigned_by',
            'assigned_by_name',
            'assigned_at',
        ]

    def validate_notes(self, value):
        """Validate assignment notes"""
        if value and len(value) > 500:
            raise serializers.ValidationError(
                "Assignment notes cannot exceed 500 characters."
            )
        return value


class TaskStatusUpdateSerializer(serializers.Serializer):
    """Serializer for task status updates"""

    status = serializers.ChoiceField(choices=TaskStatus.choices())
    reason = serializers.CharField(required=False, allow_blank=True)

    def validate_status(self, value):
        """Validate status transition"""
        # This will be validated in the view with workflow engine
        return value


class TaskAssignmentSerializer(serializers.Serializer):
    """Serializer for task assignment"""

    assigned_to_id = serializers.UUIDField()
    notes = serializers.CharField(required=False, allow_blank=True)

    def validate_assigned_to_id(self, value):
        """Validate assigned user exists"""
        from apps.users.models import User
        try:
            User.objects.get(id=value)
        except User.DoesNotExist:
            raise serializers.ValidationError("Assigned user does not exist.")
        return value
