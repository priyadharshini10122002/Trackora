"""
Unit tests for domain entities.
"""

import pytest
import uuid
from datetime import datetime, timedelta
from domain.entities.entities import TaskEntity, UserEntity, AssignmentEntity, CommentEntity
from domain.value_objects.enums import TaskStatus, TaskPriority, UserRole


class TestTaskEntity:
    """Test cases for TaskEntity"""

    def test_task_entity_creation(self):
        """Test creating a valid TaskEntity"""
        task_id = uuid.uuid4()
        creator_id = uuid.uuid4()
        due_date = datetime.now() + timedelta(days=7)

        task = TaskEntity(
            id=task_id,
            title="Valid Title Length Here",  # 10+ chars to pass validator
            description="Test description",
            priority=TaskPriority.HIGH,
            status=TaskStatus.DRAFT,
            due_date=due_date,
            sla_hours=24,
            created_by_id=creator_id,
            assigned_to_id=None,
            is_deleted=False,
            deleted_at=None,
            deleted_by_id=None
        )

        assert task.id == task_id
        assert task.title == "Valid Title Length Here"
        assert task.priority == TaskPriority.HIGH
        assert task.status == TaskStatus.DRAFT
        assert task.sla_hours == 24
        assert not task.is_deleted

    def test_task_entity_invalid_title_length(self):
        """Test TaskEntity rejects titles that are too short"""
        task_id = uuid.uuid4()
        creator_id = uuid.uuid4()
        due_date = datetime.now() + timedelta(days=7)

        with pytest.raises(ValueError, match="title must be between 10 and 150 characters"):
            TaskEntity(
                id=task_id,
                title="Short",  # Too short
                description="Test description",
                priority=TaskPriority.HIGH,
                status=TaskStatus.DRAFT,
                due_date=due_date,
                sla_hours=24,
                created_by_id=creator_id,
                assigned_to_id=None,
                is_deleted=False,
                deleted_at=None,
                deleted_by_id=None
            )

    def test_task_entity_invalid_sla_hours(self):
        """Test TaskEntity rejects invalid SLA hours"""
        task_id = uuid.uuid4()
        creator_id = uuid.uuid4()
        due_date = datetime.now() + timedelta(days=7)

        with pytest.raises(ValueError, match="SLA hours must be positive"):
            TaskEntity(
                id=task_id,
                title="Valid Title Length Here",
                description="Test description",
                priority=TaskPriority.HIGH,
                status=TaskStatus.DRAFT,
                due_date=due_date,
                sla_hours=0,  # Invalid
                created_by_id=creator_id,
                assigned_to_id=None,
                is_deleted=False,
                deleted_at=None,
                deleted_by_id=None
            )

    def test_task_entity_past_due_date(self):
        """Test TaskEntity accepts past due dates (for flexibility)"""
        task_id = uuid.uuid4()
        creator_id = uuid.uuid4()
        past_date = datetime.now() - timedelta(days=1)

        # Should not raise an error - business logic handles this
        task = TaskEntity(
            id=task_id,
            title="Valid Title Length Here",
            description="Test description",
            priority=TaskPriority.HIGH,
            status=TaskStatus.DRAFT,
            due_date=past_date,
            sla_hours=24,
            created_by_id=creator_id,
            assigned_to_id=None,
            is_deleted=False,
            deleted_at=None,
            deleted_by_id=None
        )

        assert task.due_date == past_date


class TestUserEntity:
    """Test cases for UserEntity"""

    def test_user_entity_creation(self):
        """Test creating a valid UserEntity"""
        user_id = uuid.uuid4()

        user = UserEntity(
            id=user_id,
            email="test@example.com",
            first_name="John",
            last_name="Doe",
            roles=[UserRole.CONTRIBUTOR, UserRole.MANAGER]
        )

        assert user.id == user_id
        assert user.email == "test@example.com"
        assert user.first_name == "John"
        assert user.last_name == "Doe"
        assert UserRole.CONTRIBUTOR in user.roles
        assert UserRole.MANAGER in user.roles

    def test_user_entity_invalid_email(self):
        """Test UserEntity rejects invalid emails"""
        user_id = uuid.uuid4()

        with pytest.raises(ValueError, match="Invalid email format"):
            UserEntity(
                id=user_id,
                email="invalid-email",  # Invalid format
                first_name="John",
                last_name="Doe",
                roles=[UserRole.CONTRIBUTOR]
            )

    def test_user_entity_has_role(self):
        """Test role checking functionality"""
        user_id = uuid.uuid4()

        user = UserEntity(
            id=user_id,
            email="test@example.com",
            first_name="John",
            last_name="Doe",
            roles=[UserRole.CONTRIBUTOR]
        )

        assert user.has_role(UserRole.CONTRIBUTOR)
        assert not user.has_role(UserRole.ADMIN)


class TestAssignmentEntity:
    """Test cases for AssignmentEntity"""

    def test_assignment_entity_creation(self):
        """Test creating a valid AssignmentEntity"""
        assignment_id = uuid.uuid4()
        task_id = uuid.uuid4()
        assigned_to_id = uuid.uuid4()
        assigned_by_id = uuid.uuid4()

        assignment = AssignmentEntity(
            id=assignment_id,
            task_id=task_id,
            assigned_to_id=assigned_to_id,
            assigned_by_id=assigned_by_id,
            notes="Please handle this urgently"
        )

        assert assignment.id == assignment_id
        assert assignment.task_id == task_id
        assert assignment.assigned_to_id == assigned_to_id
        assert assignment.assigned_by_id == assigned_by_id
        assert assignment.notes == "Please handle this urgently"


class TestCommentEntity:
    """Test cases for CommentEntity"""

    def test_comment_entity_creation(self):
        """Test creating a valid CommentEntity"""
        comment_id = uuid.uuid4()
        task_id = uuid.uuid4()
        author_id = uuid.uuid4()

        comment = CommentEntity(
            id=comment_id,
            task_id=task_id,
            author_id=author_id,
            content="This is a test comment",
            is_internal=False
        )

        assert comment.id == comment_id
        assert comment.task_id == task_id
        assert comment.author_id == author_id
        assert comment.content == "This is a test comment"
        assert not comment.is_internal

    def test_comment_entity_empty_content(self):
        """Test CommentEntity rejects empty content"""
        comment_id = uuid.uuid4()
        task_id = uuid.uuid4()
        author_id = uuid.uuid4()

        with pytest.raises(ValueError, match="Comment content cannot be empty"):
            CommentEntity(
                id=comment_id,
                task_id=task_id,
                author_id=author_id,
                content="",  # Empty
                is_internal=False
            )
