#!/usr/bin/env python
"""
Database seeding script for Trackora.
Creates sample data for learning and testing purposes.
"""

import os
import sys
import django
from datetime import datetime, timedelta
from uuid import uuid4

# Setup Django
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'trackora.settings.development')
django.setup()

from django.contrib.auth import get_user_model
from apps.users.models import Role, UserRole
from apps.tasks.models import Task, TaskHistory, Comment, Attachment, Assignment
from apps.notifications.models import Notification
from domain.value_objects.enums import TaskStatus, TaskPriority, UserRole as UserRoleEnum

User = get_user_model()


def clear_data():
    """Clear existing data (optional - be careful!)"""
    print("Clearing existing data...")
    Task.objects.all().delete()
    User.objects.filter(is_superuser=False).delete()
    print("✓ Data cleared")


def create_roles():
    """Create default roles"""
    print("Creating roles...")
    
    roles_data = [
        {
            'name': UserRoleEnum.ADMIN.value,
            'description': 'Full system access'
        },
        {
            'name': UserRoleEnum.MANAGER.value,
            'description': 'Can approve tasks and manage users'
        },
        {
            'name': UserRoleEnum.CONTRIBUTOR.value,
            'description': 'Can create and work on tasks'
        },
        {
            'name': UserRoleEnum.VIEWER.value,
            'description': 'Read-only access'
        },
    ]
    
    roles = {}
    for role_data in roles_data:
        role, created = Role.objects.get_or_create(
            name=role_data['name'],
            defaults={
                'description': role_data['description']
            }
        )
        roles[role.name] = role
        print(f"  {'Created' if created else 'Exists'}: {role.name}")
    
    return roles


def create_users(roles):
    """Create sample users with different roles"""
    print("\nCreating users...")
    
    users_data = [
        {
            'email': 'admin@trackora.com',
            'password': 'Admin123!',
            'first_name': 'Admin',
            'last_name': 'User',
            'role': UserRoleEnum.ADMIN.value
        },
        {
            'email': 'manager@trackora.com',
            'password': 'Manager123!',
            'first_name': 'Manager',
            'last_name': 'Smith',
            'role': UserRoleEnum.MANAGER.value
        },
        {
            'email': 'john@trackora.com',
            'password': 'John123!',
            'first_name': 'John',
            'last_name': 'Doe',
            'role': UserRoleEnum.CONTRIBUTOR.value
        },
        {
            'email': 'jane@trackora.com',
            'password': 'Jane123!',
            'first_name': 'Jane',
            'last_name': 'Wilson',
            'role': UserRoleEnum.CONTRIBUTOR.value
        },
        {
            'email': 'viewer@trackora.com',
            'password': 'Viewer123!',
            'first_name': 'Viewer',
            'last_name': 'Guest',
            'role': UserRoleEnum.VIEWER.value
        },
    ]
    
    users = {}
    admin_user = User.objects.filter(is_superuser=True).first()
    
    for user_data in users_data:
        user, created = User.objects.get_or_create(
            email=user_data['email'],
            defaults={
                'first_name': user_data['first_name'],
                'last_name': user_data['last_name'],
            }
        )
        
        if created:
            user.set_password(user_data['password'])
            user.save()
        
        users[user_data['email']] = user
        
        # Assign role
        role = roles[user_data['role']]
        UserRole.objects.get_or_create(
            user=user,
            role=role,
            defaults={'assigned_by': admin_user or user}
        )
        
        print(f"  {'Created' if created else 'Exists'}: {user.email} ({user_data['role']})")
    
    return users


def create_tasks(users):
    """Create sample tasks in various states"""
    print("\nCreating tasks...")
    
    admin = users.get('admin@trackora.com')
    manager = users.get('manager@trackora.com')
    john = users.get('john@trackora.com')
    jane = users.get('jane@trackora.com')
    
    tasks_data = [
        # DRAFT tasks
        {
            'title': 'Setup CI/CD Pipeline',
            'description': 'Configure GitHub Actions for automated testing and deployment',
            'status': TaskStatus.DRAFT.value,
            'priority': TaskPriority.HIGH.value,
            'created_by': john,
            'assigned_to': None,
            'due_date': datetime.now() + timedelta(days=7),
            'sla_hours': 48
        },
        {
            'title': 'Write API Documentation',
            'description': 'Document all REST API endpoints with examples',
            'status': TaskStatus.DRAFT.value,
            'priority': TaskPriority.MEDIUM.value,
            'created_by': jane,
            'assigned_to': None,
            'due_date': datetime.now() + timedelta(days=5),
            'sla_hours':  36
        },
        
        # PENDING_APPROVAL tasks
        {
            'title': 'Implement User Profile Page',
            'description': 'Design and implement user profile management UI',
            'status': TaskStatus.PENDING_APPROVAL.value,
            'priority': TaskPriority.MEDIUM.value,
            'created_by': john,
            'assigned_to': None,
            'due_date': datetime.now() + timedelta(days=10),
            'sla_hours': 72
        },
        {
            'title': 'Add Search Functionality',
            'description': 'Implement full-text search for tasks',
            'status': TaskStatus.PENDING_APPROVAL.value,
            'priority': TaskPriority.LOW.value,
            'created_by': jane,
            'assigned_to': None,
            'due_date': datetime.now() + timedelta(days=14),
            'sla_hours': 96
        },
        
        # APPROVED tasks
        {
            'title': 'Database Migration for Tags',
            'description': 'Create migration to add tags to tasks',
            'status': TaskStatus.APPROVED.value,
            'priority': TaskPriority.HIGH.value,
            'created_by': john,
            'assigned_to': john,
            'due_date': datetime.now() + timedelta(days=3),
            'sla_hours': 24
        },
        {
            'title': 'Setup Redis Caching',
            'description': 'Configure Redis for caching task statistics',
            'status': TaskStatus.APPROVED.value,
            'priority': TaskPriority.HIGH.value,
            'created_by': jane,
            'assigned_to': jane,
            'due_date': datetime.now() + timedelta(days=5),
            'sla_hours': 48
        },
        
        # IN_PROGRESS tasks
        {
            'title': 'Implement Email Notifications',
            'description': 'Send email notifications for task assignments',
            'status': TaskStatus.IN_PROGRESS.value,
            'priority': TaskPriority.MEDIUM.value,
            'created_by': manager,
            'assigned_to': john,
            'due_date': datetime.now() + timedelta(days=4),
            'sla_hours': 36
        },
        {
            'title': 'Add Task Filters',
            'description': 'Add filtering by priority, status, assignee',
            'status': TaskStatus.IN_PROGRESS.value,
            'priority': TaskPriority.MEDIUM.value,
            'created_by': manager,
            'assigned_to': jane,
            'due_date': datetime.now() + timedelta(days=6),
            'sla_hours': 48
        },
        {
            'title': 'Performance Optimization',
            'description': 'Optimize database queries for task list',
            'status': TaskStatus.IN_PROGRESS.value,
            'priority': TaskPriority.HIGH.value,
            'created_by': admin,
            'assigned_to': john,
            'due_date': datetime.now() + timedelta(days=2),
            'sla_hours': 24
        },
        
        # COMPLETED tasks
        {
            'title': 'Setup Development Environment',
            'description': 'Configure Docker and docker-compose for local development',
            'status': TaskStatus.COMPLETED.value,
            'priority': TaskPriority.HIGH.value,
            'created_by': admin,
            'assigned_to': john,
            'due_date': datetime.now() - timedelta(days=10),
            'sla_hours': 48
        },
        {
            'title': 'Implement JWT Authentication',
            'description': 'Add JWT-based authentication with refresh tokens',
            'status': TaskStatus.COMPLETED.value,
            'priority': TaskPriority.HIGH.value,
            'created_by': manager,
            'assigned_to': jane,
            'due_date': datetime.now() - timedelta(days=8),
            'sla_hours': 72
        },
        {
            'title': 'Create Database Models',
            'description': 'Design and implement Task, User, and related models',
            'status': TaskStatus.COMPLETED.value,
            'priority': TaskPriority.HIGH.value,
            'created_by': admin,
            'assigned_to': john,
            'due_date': datetime.now() - timedelta(days=15),
            'sla_hours': 96
        },
        
        # CLOSED tasks
        {
            'title': 'Initial Project Setup',
            'description': 'Create Django project structure',
            'status': TaskStatus.CLOSED.value,
            'priority': TaskPriority.HIGH.value,
            'created_by': admin,
            'assigned_to': admin,
            'due_date': datetime.now() - timedelta(days=20),
            'sla_hours': 24
        },
        {
            'title': 'Setup PostgreSQL Database',
            'description': 'Configure PostgreSQL for production',
            'status': TaskStatus.CLOSED.value,
            'priority': TaskPriority.HIGH.value,
            'created_by': admin,
            'assigned_to': manager,
            'due_date': datetime.now() - timedelta(days=18),
            'sla_hours': 48
        },
        
        # Overdue task (for SLA testing)
        {
            'title': 'Fix Critical Bug',
            'description': 'Urgent: Fix login issue affecting all users',
            'status': TaskStatus.IN_PROGRESS.value,
            'priority': TaskPriority.CRITICAL.value,
            'created_by': admin,
            'assigned_to': john,
            'due_date': datetime.now() - timedelta(days=1),
            'sla_hours': 4  # Overdue!
        },
    ]
    
    tasks = []
    for task_data in tasks_data:
        task = Task.objects.create(**task_data)
        tasks.append(task)
        print(f"  Created: {task.title} ({task.status})")
    
    return tasks


def create_task_history(tasks):
    """Create task history for audit trail"""
    print("\nCreating task history...")
    print("  Note: Skipping history creation - create through API for proper audit trail")
    # The TaskHistory model has a save override that prevents updates
    # To properly populate history, tasks should be transitioned through the API
    # which will automatically create history records


def create_comments(tasks, users):
    """Create sample comments"""
    print("\nCreating comments...")
    
    john = users.get('john@trackora.com')
    jane = users.get('jane@trackora.com')
    manager = users.get('manager@trackora.com')
    
    comments_data = [
        {
            'task': tasks[0],
            'author': john,
            'content': 'I can start working on this next week.',
            'is_internal': False
        },
        {
            'task': tasks[6],
            'author': jane,
            'content': 'I\'ve configured the SMTP settings. Testing now.',
            'is_internal': False
        },
        {
            'task': tasks[6],
            'author': manager,
            'content': 'Internal note: Use SendGrid for production',
            'is_internal': True
        },
        {
            'task': tasks[8],
            'author': john,
            'content': 'Reduced query time from 2s to 200ms!',
            'is_internal': False
        },
        {
            'task': tasks[14],
            'author': john,
            'content': 'This is urgent! Working on it now.',
            'is_internal': False
        },
    ]
    
    for comment_data in comments_data:
        Comment.objects.create(**comment_data)
        print(f"  Created comment on: {comment_data['task'].title}")


def create_notifications(tasks, users):
    """Create sample notifications"""
    print("\nCreating notifications...")
    
    john = users.get('john@trackora.com')
    jane = users.get('jane@trackora.com')
    
    notifications_data = [
        {
            'recipient': john,
            'notification_type': 'task_assigned',
            'title': 'New task assigned',
            'message': f'You have been assigned: {tasks[6].title}',
            'priority': 'high',
            'is_read': False
        },
        {
            'recipient': john,
            'notification_type': 'task_due_soon',
            'title': 'Task due soon',
            'message': f'{tasks[8].title} is due in 2 days',
            'priority': 'medium',
            'is_read': False
        },
        {
            'recipient': john,
            'notification_type': 'task_overdue',
            'title': 'Task overdue!',
            'message': f'{tasks[14].title} is overdue',
            'priority': 'urgent',
            'is_read': True
        },
        {
            'recipient': jane,
            'notification_type': 'task_assigned',
            'title': 'New task assigned',
            'message': f'You have been assigned: {tasks[7].title}',
            'priority': 'high',
            'is_read': True
        },
    ]
    
    for notification_data in notifications_data:
        Notification.objects.create(**notification_data)
        print(f"  Created notification for: {notification_data['recipient'].email}")


def main():
    """Main seeding function"""
    print("=" * 60)
    print("  Trackora Database Seeding Script")
    print("=" * 60)
    
    # Optionally clear existing data
    # clear_data()  # Uncomment to clear data first
    
    # Create data
    roles = create_roles()
    users = create_users(roles)
    tasks = create_tasks(users)
    create_task_history(tasks)
    create_comments(tasks, users)
    create_notifications(tasks, users)
    
    print("\n" + "=" * 60)
    print("✓ Database seeding completed successfully!")
    print("=" * 60)
    print("\nSample Users:")
    print("  Admin:       admin@trackora.com / Admin123!")
    print("  Manager:     manager@trackora.com / Manager123!")
    print("  Contributor: john@trackora.com / John123!")
    print("  Contributor: jane@trackora.com / Jane123!")
    print("  Viewer:      viewer@trackora.com / Viewer123!")
    print("\nYou can now:")
    print("  1. Login via API: POST /api/auth/login/")
    print("  2. View tasks: GET /api/v1/tasks/")
    print("  3. Access admin: http://localhost:8000/admin")
    print("=" * 60)


if __name__ == '__main__':
    main()
