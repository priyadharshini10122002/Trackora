# Trackora - Learning Path

**Welcome to your Django learning journey!** This guide will help you explore the Trackora application systematically to understand production-grade Django development.

## Prerequisites

- Basic Python knowledge
- Basic understanding of REST APIs
- Django basics (models, views)
- Tools: Git, Docker, Postman (or curl)

---

## Setup (5 minutes)

### 1. Start the Application

```bash
cd c:\Django_Refreshment\trackora

# Start with Docker
docker compose up --build
```

**Services started**:
- Web API: http://localhost:8000
- PostgreSQL database
- Redis cache
- Celery worker
- Celery beat scheduler

### 2. Run Database Migrations

```bash
# In a new terminal
docker compose exec web python manage.py migrate

# Create a superuser
docker compose exec web python manage.py createsuperuser
```

### 3. Seed Sample Data

```bash
# Run the seeding script
docker compose exec web python scripts/seed_database.py
```

This creates:
- 5 users with different roles (admin, manager, contributors, viewer)
- 20 sample tasks in various states
- Comments and notifications

---

## Learning Modules

### Module 1: Understanding the Architecture (30 minutes)

**Goal**: Understand the layered architecture and separation of concerns

#### 1.1 Explore the Domain Layer

**Location**: `domain/`

```python
# Open and study these files:
domain/value_objects/enums.py       # Business enums (TaskStatus, UserRole, etc.)
domain/workflows/workflows.py        # Workflow engine
domain/entities/entities.py          # Domain entities
domain/exceptions/domain_exceptions.py  # Business exceptions
```

**Key Questions**:
- What are the possible task statuses?
- What roles exist in the system?
- How does the WorkflowEngine validate transitions?
- Why are domain entities separate from Django models?

**Exercise**:
- Modify `WorkflowEngine` to add a new transition
- Test it by reviewing the transition rules

#### 1.2 Explore the Infrastructure Layer

**Location**: `infrastructure/`

```python
# Study these files:
infrastructure/cache/cache_service.py     # Caching abstraction
infrastructure/repositories/base_repository.py  # Repository pattern
infrastructure/repositories/task_repository.py  # Task data access
```

**Key Questions**:
- How are cache keys structured?
- What are the different TTL values?
- How does the repository pattern abstract data access?
- Why use repositories instead of direct ORM queries?

**Exercise**:
- Find where `CacheService.get_task_stats()` is called
- Trace the cache invalidation flow when a task is created

#### 1.3 Explore the Database Layer

**Location**: `apps/*/models.py`

```python
# Study these models:
apps/users/models.py    # User, Role, UserRole
apps/tasks/models.py    # Task, TaskHistory, Comment, Attachment
apps/notifications/models.py  # Notification, UserPreference
```

**Key Questions**:
- How is the User model customized from Django's default?
- What relationships exist between Task and User?
- How is the audit trail (TaskHistory) implemented?
- What fields use UUIDs vs auto-incrementing IDs?

**Exercise**:
- Use Django admin (http://localhost:8000/admin) to view the data
- Create a task manually and observe the related objects created

---

### Module 2: API Layer & REST Patterns (45 minutes)

**Goal**: Understand how Django REST Framework is used for API development

#### 2.1 Explore API Views

**Location**: `apps/tasks/api/views.py`

```python
# Study the TaskViewSet:
class TaskViewSet(viewsets.ModelViewSet):
    - get_serializer_class()  # Dynamic serializer selection
    - get_permissions()        # Permission classes
    - get_queryset()           # Role-based filtering
    - perform_create()         # Post-creation logic
    - Custom actions (@action decorator)
```

**Key Concepts**:
- **ViewSets**: Combines CRUD operations
- **Actions**: Custom endpoints (submit_for_approval, approve, etc.)
- **Filters**: DjangoFilterBackend, SearchFilter, OrderingFilter
- **Permissions**: Per-action permission classes

**Exercise**:
- Test the task creation API with Postman
- Try creating, submitting, and approving a task
- Observe permission errors when using wrong user roles

#### 2.2 Explore Serializers

**Location**: `apps/tasks/api/serializers.py`

```python
# Study different serializers:
TaskCreateSerializer     # For creating tasks
TaskDetailSerializer     # For detailed view
TaskListSerializer       # For list view (optimized)
TaskUpdateSerializer     # For updates
```

**Key Concepts**:
- **Validation**: Field-level and object-level validation
- **Representation**: Customizing output format
- **Nested serializers**: Embedding related objects
- **Read-only fields**: Protecting certain fields

**Exercise**:
- Compare `TaskListSerializer` vs `TaskDetailSerializer`
- Why does list use fewer fields?
- Add a custom validation to prevent tasks with past due dates

#### 2.3 Explore Permissions

**Location**: `apps/tasks/api/permissions.py`

```python
# Study permission classes:
CanCreateTask       # Who can create
CanEditTask         # Who can edit
CanApproveTask      # Who can approve
CanAssignTask       # Who can assign
```

**Key Concepts**:
- **has_permission**: Request-level check
- **has_object_permission**: Object-level check
- **Role-based logic**: Checking user roles

**Exercise**:
- Try to approve a task as a CONTRIBUTOR (should fail)
- Try to create a task as VIEWER (should fail)
- Understand the difference between creating vs approving permissions

---

### Module 3: Authentication & Security (30 minutes)

**Goal**: Understand JWT authentication and security measures

#### 3.1 JWT Authentication Flow

**Location**: `apps/users/api/views.py`

```python
# Study these endpoints:
register_user()          # Creates user + returns tokens
CustomTokenObtainPairView  # Login
logout_user()            # Blacklists refresh token
```

**Key Concepts**:
- **Access tokens**: Short-lived (15 min)
- **Refresh tokens**: Long-lived (7 days)
- **Token rotation**: New tokens on refresh
- **Blacklisting**: Preventing reuse after logout

**Exercise**:
- Register a new user via API
- Login and receive tokens
- Use access token to create a task
- Wait 15 minutes, see token expire
- Use refresh token to get new access token
- Logout and try to reuse refresh token (should fail)

#### 3.2 Security Middleware

**Location**: `apps/core/middleware/`

```python
# Study these middleware:
rate_limit.py        # Rate limiting (300 req/min)
request_logging.py   # Request/response logging
correlation_id.py    # Request tracing
```

**Key Concepts**:
- **Rate limiting**: Preventing abuse
- **Logging**: Structured logs with correlation IDs
- **Tracing**: Following a request through the system

**Exercise**:
- Make 301 requests rapidly (should get rate limited)
- Check logs to find correlation IDs
- Trace a single request through the logs

---

### Module 4: Workflow Engine (30 minutes)

**Goal**: Understand how business workflows are enforced

#### 4.1 Workflow Rules

**Location**: `domain/workflows/workflows.py`

```python
class WorkflowEngine:
    TRANSITIONS = {
        TaskStatus.DRAFT: {
            TaskStatus.PENDING_APPROVAL: [UserRole.CONTRIBUTOR, ...]
        },
        ...
    }
```

**Key Concepts**:
- **State machine**: Valid transitions
- **Role-based transitions**: Who can perform which action
- **Validation**: Preventing invalid state changes

**Exercise**:
- Try to approve a DRAFT task directly (should fail)
- Try to complete a task that's not IN_PROGRESS (should fail)
- Submit a task, approve it, assign it, start it, complete it, close it
- View the task history to see all transitions

#### 4.2 Task History (Audit Trail)

**Location**: `apps/tasks/models.py` (TaskHistory model)

```python
# Every state change is recorded:
TaskHistory.objects.create(
    task=task,
    old_status=old_status,
    new_status=new_status,
    changed_by=user,
    reason=reason
)
```

**Exercise**:
- Create and transition a task through all states
- Fetch task history: `GET /api/v1/tasks/{id}/history/`
- Observe timestamps, reasons, and who made changes

---

### Module 5: Caching Strategy (30 minutes)

**Goal**: Understand Redis caching for performance

#### 5.1 Cache Service

**Location**: `infrastructure/cache/cache_service.py`

```python
# Study caching patterns:
CacheService.get_task_stats()  # Get from cache
CacheService.set_task_stats()  # Set in cache
CacheService.invalidate_task_stats()  # Clear cache
```

**Key Concepts**:
- **Cache keys**: Consistent naming (prefix:type:id)
- **TTL values**: SHORT (5m), MEDIUM (30m), LONG (1h)
- **Cache invalidation**: When to clear cache
- **Cache-aside pattern**: Check cache → miss → query DB → cache result

**Exercise**:
- Call `GET /api/v1/tasks/stats/` (slow - computes from DB)
- Call it again immediately (fast - served from cache)
- Create a new task
- Call stats again (cache invalidated, slow again)
- Use Redis CLI to inspect cache keys:
  ```bash
  docker compose exec redis redis-cli
  KEYS trackora:*
  ```

#### 5.2 Cache Usage in Views

**Location**: `apps/tasks/api/views.py` (stats action)

```python
@action(detail=False, methods=['get'])
def stats(self, request):
    cached = CacheService.get_task_stats(user_id=user_id)
    if cached:
        return Response(cached)  # Cache hit
    
    stats = compute_stats()  # Expensive DB query
    CacheService.set_task_stats(stats, user_id=user_id)
    return Response(stats)
```

**Exercise**:
- Add print statements to see cache hits/misses
- Time the response with/without cache
- Understand when cache is invalidated

---

### Module 6: Background Jobs (Celery) (30 minutes)

**Goal**: Understand async task processing

#### 6.1 Celery Tasks

**Location**: `apps/tasks/tasks.py`, `apps/users/tasks.py`, `apps/notifications/tasks.py`

```python
# Study these tasks:
@shared_task
def check_sla_breaches():
    # Runs every 5 minutes
    # Finds overdue tasks
    # Creates notifications

@shared_task
def cleanup_old_tokens():
    # Runs daily at 2 AM
    # Removes expired blacklisted tokens
```

**Key Concepts**:
- **Shared tasks**: Can be called from anywhere
- **Periodic tasks**: Scheduled by Celery Beat
- **Async execution**: Doesn't block the web request

**Exercise**:
- Check Celery Beat schedule: `trackora/settings/base.py` (CELERY_BEAT_SCHEDULE)
- Monitor Celery worker logs:
  ```bash
  docker compose logs -f celery-worker
  ```
- Create a task with past due_date
- Wait 5 minutes for SLA breach check
- Verify notification is created

#### 6.2 Manual Task Execution

```python
# From Django shell:
docker compose exec web python manage.py shell

from apps.tasks.tasks import check_sla_breaches
result = check_sla_breaches.delay()  # Async
print(result.get())  # Wait for result
```

**Exercise**:
- Run `cleanup_old_tokens` manually
- Create a custom Celery task
- Schedule it to run periodically

---

### Module 7: Testing (30 minutes)

**Goal**: Understand the testing strategy

#### 7.1 Explore Test Structure

**Location**: `tests/`

```
tests/
├── unit/           # Unit tests (individual functions)
├── integration/    # Integration tests (multiple components)
└── performance/    # Load tests (Locust)
```

**Key Concepts**:
- **Unit tests**: Test individual components in isolation
- **Integration tests**: Test component interactions
- **Fixtures**: Reusable test data (conftest.py)
- **Pytest**: Testing framework

**Exercise**:
- Run all tests:
  ```bash
  docker compose exec web python -m pytest -v
  ```
- Run specific test file:
  ```bash
  docker compose exec web python -m pytest tests/unit/test_workflow.py -v
  ```
- Study `tests/conftest.py` for fixtures
- Write a new test for task creation

#### 7.2 API Testing

**Location**: `tests/integration/test_task_api.py`

```python
def test_create_task(authenticated_client, sample_user):
    response = authenticated_client.post('/api/v1/tasks/', data={...})
    assert response.status_code == 201
```

**Exercise**:
- Study how authentication is handled in tests
- Add a test for the approval workflow
- Test permission failures

---

### Module 8: Deployment & Production (15 minutes)

**Goal**: Understand production configuration

#### 8.1 Docker Setup

**Location**: `Dockerfile`, `docker-compose.yml`

**Key Concepts**:
- **Multi-container setup**: web, db, redis, worker, beat
- **Environment variables**: .env file
- **Health checks**: Ensuring services are ready
- **Volumes**: Persistent data

**Exercise**:
- Review `docker-compose.yml` services
- Understand the web command: `gunicorn`
- Check health endpoints:
  ```bash
  curl http://localhost:8000/health/
  curl http://localhost:8000/health/db/
  curl http://localhost:8000/health/redis/
  curl http://localhost:8000/health/celery/
  ```

#### 8.2 Settings Configuration

**Location**: `trackora/settings/`

```python
base.py          # Shared settings
development.py   # Dev overrides
production.py    # Prod overrides
test.py          # Test settings
```

**Key Concepts**:
- **Environment-based settings**: Different configs per environment
- **Security settings**: SECRET_KEY, DEBUG, ALLOWED_HOSTS
- **Database**: PostgreSQL connection
- **Caching**: Redis configuration

**Exercise**:
- Compare development.py vs production.py
- Understand when to use which settings file
- Review security settings in base.py

---

## Project Challenges

Ready to test your knowledge? Try these challenges:

### Challenge 1: Add a New Task Priority
- Add a new priority level "CRITICAL"
- Update the enum, migrations, and serializers
- Test creating a task with the new priority

### Challenge 2: Implement Task Dependencies
- Allow tasks to depend on other tasks
- A task can't be started until dependencies are COMPLETED
- Update models, serializers, and workflow validation

### Challenge 3: Add Email Notifications
- When a task is assigned, email the assignee
- Use Celery to send emails asynchronously
- Configure email backend

### Challenge 4: Add Task Tags
- Create a Tag model
- Allow tasks to have multiple tags
- Add filtering by tags

### Challenge 5: Implement API Rate Limiting Per User
- Current rate limiting is per IP
- Implement per-user rate limiting
- Different limits for different roles

---

## Deep Dive Topics

Want to go deeper? Study these topics:

### 1. Repository Pattern
- Why abstract data access?
- Compare direct ORM queries vs repository methods
- When to use repositories vs Django ORM

### 2. Domain-Driven Design
- Why separate domain entities from Django models?
- What are value objects?
- How are domain events useful?

### 3. Caching Strategies
- Cache-aside pattern
- Write-through cache
- Cache invalidation strategies

### 4. JWT vs Session Authentication
- Pros and cons of JWT
- Token refresh strategies
- Security considerations

### 5. Celery Architecture
- Worker vs Beat
- Task routing
- Result backends
- Error handling

---

## Additional Resources

### Official Documentation
- Django: https://docs.djangoproject.com
- Django REST Framework: https://www.django-rest-framework.org
- Celery: https://docs.celeryproject.org
- PostgreSQL: https://www.postgresql.org/docs/
- Redis: https://redis.io/documentation

### Project Files
- [ARCHITECTURE.md](file:///c:/Django_Refreshment/trackora/docs/ARCHITECTURE.md) - System architecture
- [API_GUIDE.md](file:///c:/Django_Refreshment/trackora/docs/API_GUIDE.md) - API usage guide
- [README.md](file:///c:/Django_Refreshment/trackora/README.md) - Quick start guide

---

## Completion Checklist

Track your learning progress:

- [ ] Module 1: Architecture (domain, infrastructure, database layers)
- [ ] Module 2: API Layer (views, serializers, permissions)  
- [ ] Module 3: Authentication & Security (JWT, middleware)
- [ ] Module 4: Workflow Engine (state machine, audit trail)
- [ ] Module 5: Caching (Redis, cache patterns)
- [ ] Module 6: Background Jobs (Celery tasks)
- [ ] Module 7: Testing (unit, integration tests)
- [ ] Module 8: Deployment (Docker, production config)
- [ ] Challenge 1: New task priority
- [ ] Challenge 2: Task dependencies
- [ ] Challenge 3: Email notifications
- [ ] Challenge 4: Task tags
- [ ] Challenge 5: Per-user rate limiting

---

**Congratulations!** You've completed the Trackora learning path. You now understand:
✅ Clean architecture & DDD
✅ REST API development with DRF
✅ JWT authentication & RBAC
✅ Caching strategies
✅ Background job processing
✅ Testing strategies
✅ Production deployment

Keep exploring and building! 🚀
