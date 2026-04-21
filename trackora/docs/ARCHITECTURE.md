# Trackora - Architecture Guide

## Table of Contents
1. [System Overview](#system-overview)
2. [Architecture Layers](#architecture-layers)
3. [Domain-Driven Design](#domain-driven-design)
4. [Workflow Engine](#workflow-engine)
5. [Caching Strategy](#caching-strategy)
6. [Security Model](#security-model)
7. [Database Schema](#database-schema)
8. [Background Processing](#background-processing)

---

## System Overview

**Trackora** is a production-ready Django REST API demonstrating enterprise-grade patterns for task orchestration. It showcases:

- **Clean Architecture** with separation of concerns
- **Domain-Driven Design** (DDD) principles
- **Repository Pattern** for data access
- **Caching** with Redis for performance
- **Async Processing** with Celery
- **Role-Based Access Control** (RBAC)
- **JWT Authentication**

### Tech Stack

| Layer | Technology |
|-------|------------|
| Framework | Django 5.1 + Django REST Framework |
| Database | PostgreSQL |
| Cache | Redis |
| Task Queue | Celery + Redis Broker |
| Authentication | JWT (Simple JWT) |
| API Documentation | drf-spectacular (OpenAPI/Swagger) |
| Deployment | Docker Compose |

---

## Architecture Layers

The application follows a **layered architecture** pattern:

```
┌─────────────────────────────────────────┐
│         API Layer (REST)                │  ← apps/*/api/
│  - ViewSets, Serializers, Permissions   │
├─────────────────────────────────────────┤
│       Application Layer                 │  ← apps/*/usecases/
│  - Use Cases, Business Logic            │
├─────────────────────────────────────────┤
│       Infrastructure Layer              │  ← infrastructure/
│  - Repositories, Cache, Storage         │
├─────────────────────────────────────────┤
│         Domain Layer                    │  ← domain/
│  - Entities, Value Objects, Workflows   │
├─────────────────────────────────────────┤
│         Database Layer                  │  ← apps/*/models.py
│  - Django ORM Models                    │
└─────────────────────────────────────────┘
```

### Layer Responsibilities

#### 1. **API Layer** (`apps/*/api/`)
- **Purpose**: HTTP interface for clients
- **Components**:
  - `views.py` - ViewSets handling HTTP requests
  - `serializers.py` - Data validation and transformation
  - `permissions.py` - Authorization rules
  - `urls.py` - Endpoint routing

**Example Flow**:
```
POST /api/v1/tasks/ 
  → TaskViewSet.create() 
  → TaskCreateSerializer validates data
  → CanCreateTask permission checks
  → perform_create() saves to DB
```

#### 2. **Application Layer** (`apps/*/usecases/`)
- **Purpose**: Orchestrate business workflows
- **Examples**:
  - `create_task.py` - Task creation logic
  - `submit_for_approval.py` - Approval workflow
  
> **Note**: Currently use cases are embedded in views for simplicity, but can be extracted.

#### 3. **Infrastructure Layer** (`infrastructure/`)
- **Purpose**: Technical implementations (not business logic)
- **Components**:
  - `cache/cache_service.py` - Redis caching abstraction
  - `repositories/` - Data access layer
  - `storage/` - File storage

**Repository Pattern Example**:
```python
# infrastructure/repositories/task_repository.py
class TaskRepository:
    def get_by_id(self, task_id: UUID) -> Optional[Task]:
        return Task.objects.filter(id=task_id).first()
    
    def get_tasks_by_status(self, status: TaskStatus) -> QuerySet:
        return Task.objects.filter(status=status.value)
```

#### 4. **Domain Layer** (`domain/`)
- **Purpose**: Core business rules (framework-independent)
- **Components**:
  - `entities/` - Domain entities
  - `value_objects/` - Immutable values (enums, etc.)
  - `workflows/` - Business workflow rules
  - `events/` - Domain events
  - `exceptions/` - Domain exceptions

**Key Principle**: This layer should have **NO** dependencies on Django or external frameworks.

---

## Domain-Driven Design

### Entities (`domain/entities/entities.py`)

Domain entities represent core business concepts:

```python
@dataclass
class TaskEntity:
    """Domain representation of a Task (NOT Django model)"""
    id: UUID
    title: str
    status: TaskStatus
    priority: TaskPriority
    created_by: UUID
    assigned_to: Optional[UUID]
    
    def can_be_approved(self) -> bool:
        """Business rule: Only pending tasks can be approved"""
        return self.status == TaskStatus.PENDING_APPROVAL
```

**Why Separate from Django Models?**
- Domain entities encapsulate **business rules**
- Django models are just **persistence mechanisms**
- Allows testing business logic without database

### Value Objects (`domain/value_objects/enums.py`)

Immutable objects that represent concepts:

```python
class TaskStatus(Enum):
    DRAFT = "DRAFT"
    PENDING_APPROVAL = "PENDING_APPROVAL"
    APPROVED = "APPROVED"
    IN_PROGRESS = "IN_PROGRESS"
    COMPLETED = "COMPLETED"
    CLOSED = "CLOSED"

class UserRole(Enum):
    ADMIN = "ADMIN"
    MANAGER = "MANAGER"
    CONTRIBUTOR = "CONTRIBUTOR"
    VIEWER = "VIEWER"
```

### Workflows (`domain/workflows/workflows.py`)

Business process rules:

```python
class WorkflowEngine:
    """Validates state transitions and permissions"""
    
    TRANSITIONS = {
        TaskStatus.DRAFT: {
            TaskStatus.PENDING_APPROVAL: [UserRole.CONTRIBUTOR, UserRole.MANAGER, UserRole.ADMIN]
        },
        TaskStatus.PENDING_APPROVAL: {
            TaskStatus.APPROVED: [UserRole.MANAGER, UserRole.ADMIN],
            TaskStatus.DRAFT: [UserRole.MANAGER, UserRole.ADMIN]  # Rejection
        },
        # ... more transitions
    }
```

**Workflow States**:
```
DRAFT → PENDING_APPROVAL → APPROVED → IN_PROGRESS → COMPLETED → CLOSED
         ↓ (reject)
       DRAFT
```

---

## Workflow Engine

The workflow engine enforces **task lifecycle rules**.

### Role-Based Transitions

| From State | To State | Allowed Roles |
|------------|----------|---------------|
| DRAFT | PENDING_APPROVAL | CONTRIBUTOR, MANAGER, ADMIN |
| PENDING_APPROVAL | APPROVED | MANAGER, ADMIN |
| PENDING_APPROVAL | DRAFT (reject) | MANAGER, ADMIN |
| APPROVED | IN_PROGRESS | CONTRIBUTOR, MANAGER, ADMIN |
| IN_PROGRESS | COMPLETED | Assigned user |
| COMPLETED | CLOSED | MANAGER, ADMIN |

### Implementation

See `apps/tasks/api/views.py` for usage:

```python
@action(detail=True, methods=['post'])
def approve(self, request, pk=None):
    task = self.get_object()
    
    # Validate transition
    WorkflowEngine.validate_transition(
        TaskStatus(task.status),
        TaskStatus.APPROVED,
        self._get_user_role()
    )
    
    # Update status
    task.status = TaskStatus.APPROVED.value
    task.save()
    
    # Record history
    TaskHistory.objects.create(...)
```

---

## Caching Strategy

### Redis Cache Architecture

```
┌──────────────┐
│   API View   │
└──────┬───────┘
       │
       ├──→ Check Cache? ──→ HIT: Return cached data
       │                      MISS: ↓
       │
       ├──→ Query Database
       │
       └──→ Cache Result (with TTL)
```

### Cache Service (`infrastructure/cache/cache_service.py`)

Centralized caching with consistent key patterns:

```python
class CacheService:
    # Cache key prefixes
    KEY_PREFIX_USER = "user"
    KEY_PREFIX_TASK = "task"
    KEY_PREFIX_STATS = "stats"
    
    # TTL values
    TTL_SHORT = 300      # 5 minutes
    TTL_MEDIUM = 1800    # 30 minutes
    TTL_LONG = 3600      # 1 hour
```

### Cache Keys Pattern

Format: `prefix:type:identifier`

Examples:
- `user:profile:123e4567` - User profile
- `task:detail:789abcde` - Task details
- `stats:tasks:user:123` - User task stats
- `stats:tasks:global` - Global task stats

### Usage Example

```python
@action(detail=False, methods=['get'])
def stats(self, request):
    # Try cache first
    cached = CacheService.get_task_stats(user_id=user_id)
    if cached:
        return Response(cached)
    
    # Compute stats
    stats = {...}  # Expensive query
    
    # Cache for 30 minutes
    CacheService.set_task_stats(stats=stats, user_id=user_id)
    return Response(stats)
```

---

## Security Model

### 1. Authentication (JWT)

**Login Flow**:
```
1. POST /api/auth/login/ {email, password}
2. Verify credentials
3. Generate JWT tokens (access + refresh)
4. Return tokens to client
```

**Token Usage**:
```
Authorization: Bearer <access_token>
```

**Settings**:
- Access token lifetime: 15 minutes
- Refresh token lifetime: 7 days
- Automatic rotation on refresh
- Blacklisting after rotation

### 2. Authorization (RBAC)

**Role Hierarchy**:
```
ADMIN (highest privilege)
  ↓
MANAGER
  ↓
CONTRIBUTOR
  ↓
VIEWER (lowest privilege)
```

### 3. Security Middleware

**Rate Limiting**:
- 300 requests per minute per IP
- Configurable via env variables

**Request Logging**:
- Logs all requests with method, path, status, duration
- Uses JSON formatter for structured logging

**Correlation IDs**:
- Adds unique ID to each request for tracing

---

## Database Schema

### Core Models

**User**:
```
User
├── id (UUID, PK)
├── email (unique)
├── first_name, last_name
├── is_active
└── Relationships:
    ├── user_roles → UserRole (Many)
    ├── created_tasks → Task (Many)
    └── assigned_tasks → Task (Many)
```

**Task**:
```
Task
├── id (UUID, PK)
├── title, description
├── status (enum)
├── priority (enum)
├── created_by → User (FK)
├── assigned_to → User (FK, nullable)
├── due_date
└── Relationships:
    ├── history → TaskHistory (Many)
    ├── comments → Comment (Many)
    ├── attachments → Attachment (Many)
    └── assignments → Assignment (Many)
```

---

## Background Processing

### Celery Tasks

**1. SLA Breach Detection** (`apps/tasks/tasks.py`):
```python
@shared_task
def check_sla_breaches():
    """Run every 5 minutes to detect overdue tasks"""
    # Find tasks past due_date
    # Create notifications for assignees
```

**2. Token Cleanup** (`apps/users/tasks.py`):
```python
@shared_task
def cleanup_old_tokens():
    """Run daily at 2 AM to clean expired tokens"""
    # Remove blacklisted tokens older than 7 days
```

**3. Daily Digest** (`apps/notifications/tasks.py`):
```python
@shared_task
def send_daily_digest():
    """Run daily at 9 AM to send email summaries"""
    # Aggregate unread notifications
    # Send email to users
```

### Celery Configuration

**Running Celery**:
```bash
# Worker (processes tasks)
celery -A trackora worker --loglevel=info

# Beat (scheduler)
celery -A trackora beat --loglevel=info
```

---

## Next Steps

Continue to:
- **API_GUIDE.md** - Learn how to use the API
- **LEARNING_PATH.md** - Step-by-step exploration guide
