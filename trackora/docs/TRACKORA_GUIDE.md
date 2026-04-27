# Trackora — Complete Project Documentation

> **Audience:** A new developer with basic Django knowledge who needs to run, understand, and contribute to Trackora from day one.
>
> **How to read this:** Sections 1–3 give you the "why" and a running server. Sections 4–10 walk the codebase layer by layer. Sections 11–14 cover operations (tests, Celery, deployment, troubleshooting). Keep the app running locally as you read — every section has paths you can open.

---

## Table of Contents

1. [What is Trackora?](#1-what-is-trackora)
2. [Technology Stack](#2-technology-stack)
3. [Quick Start — Run It in 10 Minutes](#3-quick-start--run-it-in-10-minutes)
4. [Project Structure & Architecture](#4-project-structure--architecture)
5. [The Domain Layer — Business Rules](#5-the-domain-layer--business-rules)
6. [The Infrastructure Layer](#6-the-infrastructure-layer)
7. [The Apps Layer — Django Adapters](#7-the-apps-layer--django-adapters)
8. [Use Cases — Where Business Logic Lives](#8-use-cases--where-business-logic-lives)
9. [Request Lifecycle — End-to-End Trace](#9-request-lifecycle--end-to-end-trace)
10. [Authentication & Authorization](#10-authentication--authorization)
11. [Notifications & Events](#11-notifications--events)
12. [Celery Background Jobs](#12-celery-background-jobs)
13. [Caching Strategy](#13-caching-strategy)
14. [Testing](#14-testing)
15. [API Reference Cheat Sheet](#15-api-reference-cheat-sheet)
16. [Configuration & Environments](#16-configuration--environments)
17. [Deployment](#17-deployment)
18. [Troubleshooting](#18-troubleshooting)
19. [Mental Model — How to Think About Changes](#19-mental-model--how-to-think-about-changes)

---

## 1. What is Trackora?

Trackora is an **Enterprise Task Orchestration & Execution Platform** — a backend REST API for managing tasks through a controlled, auditable workflow. It is not a UI. Any frontend (React, mobile, Postman) consumes it over HTTP + JSON.

### What Problem It Solves

Generic to-do apps let anyone move a task anywhere. Trackora is for organizations that need:

- **A controlled lifecycle** — tasks move through defined states (DRAFT → PENDING_APPROVAL → APPROVED → IN_PROGRESS → COMPLETED → CLOSED), not arbitrary ones
- **Role-based authority** — only MANAGER/ADMIN can approve; only the assignee can start work
- **Audit trail** — every state change writes an immutable history row with who, when, why
- **SLA tracking** — automatic detection of overdue tasks with notifications
- **Notifications** — in-app and email alerts on meaningful events
- **Comments & attachments** — discussion and file sharing per task, with internal/public visibility

### The Six Task States

```
  DRAFT ──submit──▶ PENDING_APPROVAL ──approve──▶ APPROVED ──start──▶ IN_PROGRESS ──complete──▶ COMPLETED ──close──▶ CLOSED
    ▲                      │
    └────── reject ────────┘
```

Each arrow is a **transition** guarded by:
1. **The state machine** — is this arrow legal at all?
2. **Role permission** — is this user's role allowed to pull this lever?
3. **Business prerequisites** — e.g. "approval requires title ≥10 chars"
4. **Actor rules** — e.g. "only the assignee can start"

All four checks happen every time, in every use case. That's the core guarantee.

### The Four Roles

| Role | Can do |
|---|---|
| **ADMIN** | Everything. Create users/roles, approve, assign, close, delete. |
| **MANAGER** | Create tasks, approve/reject, assign, close. Sees all tasks. |
| **CONTRIBUTOR** | Work on assigned tasks (start, complete), comment, attach files. Sees own+assigned tasks. |
| **VIEWER** | Read-only. Sees own+assigned tasks. |

---

## 2. Technology Stack

| Layer | Tech |
|---|---|
| Language | Python 3.13 |
| Web framework | Django 5.1 |
| API framework | Django REST Framework |
| Auth | SimpleJWT (access + refresh tokens, token blacklist) |
| Database | PostgreSQL (prod), SQLite (tests) |
| Cache & broker | Redis (prod), LocMem (dev/tests) |
| Background jobs | Celery + Celery Beat |
| API docs | drf-spectacular (Swagger / Redoc) |
| Filtering | django-filter |
| CORS | django-cors-headers |
| Config | python-decouple + dj-database-url |
| Containerization | Docker + docker-compose |
| Testing | pytest + pytest-django |

---

## 3. Quick Start — Run It in 10 Minutes

### 3.1 Prerequisites

- Python 3.13 installed
- PostgreSQL running locally (or skip — falls back to SQLite if `DATABASE_URL` is unset)
- Redis running locally (optional for dev; dev settings use LocMem cache)

### 3.2 Setup

```powershell
# From repo root
cd C:\Django_Refreshment\trackora

# Create & activate venv (already exists in this repo)
.\venv\Scripts\activate

# Install deps
pip install -r requirements\base.txt
pip install -r requirements\test.txt   # only if you plan to run tests

# Copy env template and edit if needed
Copy-Item .env.example .env

# (Optional) Set up Postgres
python setup_postgres.py

# Run migrations
python manage.py migrate

# Seed users (admin, manager, john, jane, viewer)
python create_superuser.py

# Start the server
python manage.py runserver
```

Server now listens on `http://localhost:8000`.

### 3.3 Seeded Test Accounts

| Email | Password | Role |
|---|---|---|
| admin@trackora.com | Admin123! | ADMIN |
| manager@trackora.com | Manager123! | MANAGER |
| john@trackora.com | John123! | CONTRIBUTOR |
| jane@trackora.com | Jane123! | CONTRIBUTOR |
| viewer@trackora.com | Viewer123! | VIEWER |

### 3.4 Try It

Open:
- **Swagger UI:** http://localhost:8000/api/docs/swagger/
- **Redoc:** http://localhost:8000/api/docs/redoc/
- **Django admin:** http://localhost:8000/admin/
- **Health check:** http://localhost:8000/health/

Or import `postman_collection.json` into Postman and run the "Login" request first to get a JWT.

### 3.5 (Optional) Run Celery for Background Jobs

In separate terminals:

```powershell
celery -A trackora worker -l info
celery -A trackora beat -l info
```

Without this, scheduled jobs (SLA breach detection, daily digest) won't fire, but the HTTP API works normally.

---

## 4. Project Structure & Architecture

### 4.1 Top-Level Layout

```
trackora/                          # repo root
├── apps/                          # Django apps (HTTP, DB, admin)
│   ├── core/                      # cross-cutting: exception handler, middleware, health
│   ├── users/                     # auth, users, roles
│   ├── tasks/                     # tasks, comments, attachments, workflows
│   └── notifications/             # notifications + event handlers
├── domain/                        # pure Python business rules (no Django)
│   ├── entities/                  # TaskEntity, UserEntity, CommentEntity
│   ├── events/                    # domain event classes + dispatcher
│   ├── exceptions/                # typed business exceptions
│   ├── value_objects/             # enums (TaskStatus, UserRole, etc.)
│   └── workflows/                 # state machine (WorkflowEngine)
├── infrastructure/                # adapters to external systems
│   ├── cache/                     # CacheService (Redis wrapper)
│   ├── repositories/              # repository pattern over ORM
│   └── storage/                   # file-upload backend
├── trackora/                      # Django project config
│   ├── settings/                  # base / development / test / production
│   ├── urls.py                    # root URL router
│   ├── celery.py                  # Celery app
│   ├── asgi.py / wsgi.py
├── tests/                         # pytest suite
│   ├── unit/                      # pure-domain tests (no DB)
│   └── integration/               # full-stack DRF tests
├── docker/                        # Dockerfile fragments, entrypoint scripts
├── docs/                          # supplementary docs
├── requirements/                  # base.txt, test.txt, production.txt
├── scripts/                       # utility scripts (prove_bypass, run_postman)
├── manage.py
├── docker-compose.yml
├── pytest.ini
├── postman_collection.json
└── README.md
```

### 4.2 Clean Architecture — The Big Idea

Trackora follows **Clean Architecture / Hexagonal** layering. Four concentric rings; **outer rings depend on inner rings, never the reverse**:

```
┌─────────────────────────────────────────────────────────────┐
│  Django project (trackora/) — composition root              │
│  ┌───────────────────────────────────────────────────────┐  │
│  │  apps/  — HTTP adapters, DRF views, ORM models        │  │
│  │  ┌─────────────────────────────────────────────────┐  │  │
│  │  │  infrastructure/ — Redis, file storage, repos   │  │  │
│  │  │  ┌───────────────────────────────────────────┐  │  │  │
│  │  │  │  domain/ — pure Python business rules     │  │  │  │
│  │  │  │  (entities, workflows, events, enums)     │  │  │  │
│  │  │  │  NO Django imports here!                  │  │  │  │
│  │  │  └───────────────────────────────────────────┘  │  │  │
│  │  └─────────────────────────────────────────────────┘  │  │
│  └───────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────┘
```

**Why this matters:** Business rules are the most valuable code. By keeping them in `domain/` with zero framework dependencies, you can:
- Unit-test them without spinning up Django or a DB
- Swap out DRF for FastAPI, or Postgres for MongoDB, without touching `domain/`
- Onboard new developers — the business rules are readable in one folder

**The golden rule:** Business logic **never** lives in views or serializers. If you ever see `if task.status == 'APPROVED' and user.role == ...` in a view, that's a bug — move it into a use case or the workflow engine.

---

## 5. The Domain Layer — Business Rules

**Location:** `domain/`
**Import policy:** This folder must never `import django` or `from apps...`. Verify with `grep -r "import django" domain/` — should return nothing.

### 5.1 `domain/value_objects/enums.py` — The Vocabulary

Central enums every layer agrees on:

```python
class TaskStatus(str, Enum):
    DRAFT = 'DRAFT'
    PENDING_APPROVAL = 'PENDING_APPROVAL'
    APPROVED = 'APPROVED'
    IN_PROGRESS = 'IN_PROGRESS'
    COMPLETED = 'COMPLETED'
    CLOSED = 'CLOSED'

class TaskPriority(str, Enum):
    LOW, MEDIUM, HIGH, CRITICAL

class UserRole(str, Enum):
    ADMIN, MANAGER, CONTRIBUTOR, VIEWER

class CommentVisibility(str, Enum):
    PUBLIC, INTERNAL
```

### 5.2 `domain/entities/entities.py` — Plain-Python Business Objects

Entities mirror the DB models but **enforce invariants in the constructor**. Example:

```python
class TaskEntity:
    def __init__(self, id, title, status, due_date, sla_hours, ...):
        ...
        self._validate()

    def _validate(self):
        if len(self.title) < 10 or len(self.title) > 150:
            raise ValueError("Task title must be 10–150 characters")
        if self.sla_hours < 1:
            raise ValueError("SLA must be at least 1 hour")
```

Entities are used in unit tests and when a use case needs to reason about a task without DB I/O.

### 5.3 `domain/workflows/workflows.py` — The State Machine

This is the heart of Trackora. **Every transition has to pass through `WorkflowEngine.validate_transition()`**.

```python
TRANSITIONS = {
    TaskStatus.DRAFT: {
        TaskStatus.PENDING_APPROVAL: [UserRole.MANAGER, UserRole.ADMIN],
    },
    TaskStatus.PENDING_APPROVAL: {
        TaskStatus.APPROVED: [UserRole.MANAGER, UserRole.ADMIN],
        TaskStatus.DRAFT:    [UserRole.MANAGER, UserRole.ADMIN],   # rejection
    },
    TaskStatus.APPROVED: {
        TaskStatus.IN_PROGRESS: [UserRole.CONTRIBUTOR, UserRole.MANAGER, UserRole.ADMIN],
    },
    TaskStatus.IN_PROGRESS: {
        TaskStatus.COMPLETED: [UserRole.CONTRIBUTOR, UserRole.MANAGER, UserRole.ADMIN],
    },
    TaskStatus.COMPLETED: {
        TaskStatus.CLOSED: [UserRole.MANAGER, UserRole.ADMIN],
    },
}
```

If you try an illegal transition → `InvalidWorkflowTransitionError`.
If your role isn't in the allowed list → same error.

`WorkflowValidator` adds **prerequisite checks** like `validate_approval_prerequisites(task)` (title ≥10 chars, due_date set, sla_hours > 0).

### 5.4 `domain/events/domain_events.py` — Event Classes

Every meaningful business action emits a domain event. Events are plain dataclasses:

- `TaskCreatedEvent`
- `TaskAssignedEvent`
- `TaskSubmittedForApprovalEvent`
- `TaskApprovedEvent`, `TaskRejectedEvent`
- `TaskStartedEvent`, `TaskCompletedEvent`, `TaskClosedEvent`
- `TaskStatusChangedEvent` (generic, emitted on every transition)
- `CommentAddedEvent`, `AttachmentAddedEvent`
- `SLABreachedEvent`

There's a module-level singleton `event_dispatcher` with:
- `register_handler(event_type_name, handler_fn)`
- `dispatch(event)` — calls every registered handler synchronously, wrapped in try/except so one broken handler can't break the caller

Handlers are registered at app startup in `apps/notifications/apps.py` (see §11).

### 5.5 `domain/exceptions/domain_exceptions.py` — Typed Errors

Custom exception types with a shared base class `DomainException`:

| Exception | HTTP status (via custom handler) |
|---|---|
| `BusinessRuleViolation` | 400 |
| `InvalidWorkflowTransitionError` | 409 |
| `InvalidTaskStateError` | 409 |
| `DuplicateEntityError` | 409 |
| `EntityNotFoundError` | 404 |
| `PermissionDeniedError` | 403 |
| `AssignmentError` | 400 |
| `SLAViolationError` | 400 |

The mapping lives in `apps/core/exception_handler.py` (§7.1).

---

## 6. The Infrastructure Layer

**Location:** `infrastructure/`
**Role:** Wrappers around external systems (Redis, file storage, ORM). Depends on `domain/` only.

### 6.1 `infrastructure/cache/cache_service.py`

A facade over Django's cache API with domain-aware key conventions:

```python
CacheService.get_task_detail(task_id)
CacheService.set_task_detail(task_id, data)
CacheService.invalidate_task_detail(task_id)

CacheService.get_task_stats(user_id=None)   # None = global stats
CacheService.set_task_stats(stats, user_id=None)
CacheService.invalidate_task_stats(user_id=None)
```

Prefix: `trackora:` (set in `CACHES['default']['KEY_PREFIX']`).
Default TTL: 5 minutes.

### 6.2 `infrastructure/repositories/`

Repository pattern abstraction over the ORM — `TaskRepository`, `UserRepository`. In practice, several use cases import ORM models directly for convenience. This is pragmatic Clean Architecture, not strict.

### 6.3 `infrastructure/storage/`

File-upload backend for attachments. Local filesystem in dev, configurable for S3/Azure in prod via `DEFAULT_FILE_STORAGE` setting.

---

## 7. The Apps Layer — Django Adapters

### 7.1 `apps/core/` — Cross-Cutting

| File | Purpose |
|---|---|
| `exception_handler.py` | Catches domain exceptions → returns JSON `{"error": {"code", "message", "details"}}` with correct HTTP status. Wired via `REST_FRAMEWORK['EXCEPTION_HANDLER']` in settings. |
| `health_checks.py` | `/health/`, `/health/db/`, `/health/redis/`, `/health/celery/` — return 200/503. |
| `middleware/request_logging.py` | Logs every request with timing. |
| `middleware/correlation_id.py` | Injects an X-Correlation-ID header for distributed tracing. |
| `middleware/rate_limit.py` | Basic per-IP rate limiting (supplements DRF throttling). |

### 7.2 `apps/users/` — Authentication

**Models (`models.py`):**
- `User` — custom user with **UUID primary key**, email as `USERNAME_FIELD`, first_name, last_name, is_active, is_staff
- `Role` — e.g. ADMIN, MANAGER
- `UserRole` — many-to-many join with metadata (assigned_by, assigned_at)

**API (`api/`):**
- `views.py` — `UserViewSet`, `RoleViewSet`, `UserRoleViewSet` + FBVs `register_user`, `logout_user`, `CustomTokenObtainPairView`
- `urls.py`:
  ```
  POST /api/v1/auth/register/
  POST /api/v1/auth/login/     → {access, refresh}
  POST /api/v1/auth/refresh/   → {access}
  POST /api/v1/auth/logout/    → blacklists refresh token
  ```
- `permissions.py` — `IsAdmin`, `IsManagerOrAdmin`, `IsOwnerOrAdmin`

### 7.3 `apps/tasks/` — The Main Domain

**Models (`models.py`):**

| Model | Purpose |
|---|---|
| `Task` | Core entity. UUID PK, title, description, priority, status, due_date, sla_hours, created_by, assigned_to, soft-delete (is_deleted/deleted_at/deleted_by). |
| `TaskHistory` | Immutable audit row. Written on every state transition with old_status, new_status, changed_by, reason, metadata (JSONField), timestamp. |
| `Assignment` | Explicit assignment record — who was assigned, by whom, when, notes. |
| `Comment` | Task comments with `is_internal` flag. Internal comments hidden from non-elevated users. |
| `Attachment` | Uploaded files with uploaded_by FK. |

The `Task` model has **dual managers**:
- `objects` — excludes soft-deleted tasks (default)
- `all_objects` — includes deleted ones (for admin recovery)

**API (`api/`):**
- `views.py` — `TaskViewSet` (CRUD + workflow actions), `CommentViewSet`, `AttachmentViewSet`
- `serializers.py` — different serializers for create/list/detail/update to show/hide fields appropriately
- `permissions.py` — granular permissions: `CanCreateTask`, `CanViewTask`, `CanEditTask`, `CanApproveTask`, `CanAssignTask`, `CanCloseTask`, `CanAddComments`, `CanAddAttachments`, `CanViewTaskHistory`
- `urls.py` — DRF router registers `tasks/`, `comments/`, `attachments/`

**Workflow actions on TaskViewSet (all are `@action(detail=True, methods=['post'])`):**

| Endpoint | Use case | Legal from | To | Allowed roles |
|---|---|---|---|---|
| `POST /tasks/{id}/submit_for_approval/` | `SubmitForApprovalUseCase` | DRAFT | PENDING_APPROVAL | MANAGER, ADMIN |
| `POST /tasks/{id}/approve/` | `ApproveTaskUseCase` | PENDING_APPROVAL | APPROVED | MANAGER, ADMIN |
| `POST /tasks/{id}/reject/` | `RejectTaskUseCase` | PENDING_APPROVAL | DRAFT | MANAGER, ADMIN |
| `POST /tasks/{id}/assign/` | `AssignTaskUseCase` | APPROVED | (no status change) | MANAGER, ADMIN |
| `POST /tasks/{id}/start/` | `StartTaskUseCase` | APPROVED | IN_PROGRESS | CONTRIBUTOR, MANAGER, ADMIN (assignee only) |
| `POST /tasks/{id}/complete/` | `CompleteTaskUseCase` | IN_PROGRESS | COMPLETED | CONTRIBUTOR, MANAGER, ADMIN |
| `POST /tasks/{id}/close/` | `CloseTaskUseCase` | COMPLETED | CLOSED | MANAGER, ADMIN |
| `GET /tasks/{id}/history/` | (direct read) | — | — | anyone with view permission |
| `GET /tasks/stats/` | (direct read, cached) | — | — | any authenticated user |

**Role-aware visibility** (`TaskViewSet.get_queryset`):
- ADMIN/MANAGER → all tasks
- CONTRIBUTOR/VIEWER → only tasks where `created_by=user OR assigned_to=user`

**Scheduled jobs (`apps/tasks/tasks.py` — Celery, not use cases):**
- `check_sla_breaches` — runs every 5 minutes, finds IN_PROGRESS tasks past their SLA, emits `SLABreachedEvent`

### 7.4 `apps/notifications/` — Event-Driven Alerts

**Models (`models.py`):**
- `Notification` — recipient, notification_type, title, message, priority, task FK, is_read, email_sent, email_sent_at
- `NotificationPreference` — per-user flags (task_assigned, task_approved, …) + `email_frequency` (immediate/daily/weekly/never)

**Event handlers (`event_handlers.py`):** This is the bridge from domain events to notifications. Registered at app startup in `apps.py`. For each event:
1. Determine recipients (assignee / creator / both, based on event type)
2. Check user's `NotificationPreference` → skip if they opted out of this type
3. Create an in-app `Notification` row
4. For **4 high-signal events** (`TaskAssignedEvent`, `TaskApprovedEvent`, `TaskRejectedEvent`, `SLABreachedEvent`) — enqueue the `send_immediate_notification` Celery task for email delivery

**Celery tasks (`tasks.py`):**
- `send_immediate_notification(notification_id)` — sends the email via `django.core.mail.send_mail`, honors `email_frequency` preference, calls `mark_email_sent()` on success, retries after 5 min on failure
- `send_daily_digest` — daily 9 AM — compiles unread notifications into a single email
- `cleanup_old_notifications` — weekly cleanup of old read notifications

**API (`api/`):**
- `NotificationViewSet` — list own notifications, mark as read, mark all as read
- `NotificationPreferenceViewSet` — user GETs/PATCHes their own preferences

---

## 8. Use Cases — Where Business Logic Lives

**Location:** `apps/tasks/usecases/`

This is the single most important folder for understanding Trackora's backend behavior. Every workflow action is one file.

### 8.1 The Base Class — `base.py`

`WorkflowUseCase.execute(request)` runs this **atomic 7-step skeleton** for every transition:

```python
@transaction.atomic
def execute(self, request: WorkflowRequest) -> WorkflowResponse:
    task = self._get_task(request.task_id)          # 1. SELECT FOR UPDATE (row lock)

    WorkflowEngine.validate_transition(              # 2. State machine + role check
        TaskStatus(task.status), self.target_status, request.actor_role
    )

    self._validate_prerequisites(task, request)      # 3. Subclass: business rules
    self._validate_actor(task, request)              # 4. Subclass: creator/assignee checks

    old_status = task.status
    self._apply(task, request)                       # 5. Subclass: mutate extra fields
    task.status = self.target_status.value
    task.save(update_fields=self._save_fields())

    TaskHistory.objects.create(                      # 6. Immutable audit row
        task=task, old_status=old_status, new_status=task.status,
        changed_by_id=request.actor_id, reason=request.reason,
        metadata=self._history_metadata(task, request),
    )

    self._invalidate_cache(task)                     # 7. Cache invalidation

    primary_event = self._build_event(task, request) # 8. Domain events
    if primary_event:
        self.event_dispatcher.dispatch(primary_event)
    self.event_dispatcher.dispatch(
        TaskStatusChangedEvent(...)                  # generic event for audit sinks
    )

    return WorkflowResponse(...)
```

**Why `select_for_update()`?** Prevents race conditions — two concurrent approve requests can't both succeed. Postgres row-level lock held until transaction commits.

**Why everything in `@transaction.atomic`?** If any step fails (validation, save, history write), the whole thing rolls back. You never end up with a status change but no history row, or vice versa.

### 8.2 Concrete Use Cases

Each subclass is short — it only declares what's unique to that transition:

```python
# approve_task.py (the entire file)
class ApproveTaskUseCase(WorkflowUseCase):
    target_status = TaskStatus.APPROVED
    default_reason = "Task approved"

    def _build_event(self, task, request):
        return TaskApprovedEvent(task_id=task.id, approved_by_id=request.actor_id)
```

The 7-step skeleton runs; `ApproveTaskUseCase` just says "my target is APPROVED, and my event is TaskApprovedEvent". Clean, composable, easy to test.

Files:
- `submit_for_approval.py` — adds `_validate_prerequisites` that calls `WorkflowValidator.validate_approval_prerequisites(task)`
- `approve_task.py` — minimal (above)
- `reject_task.py` — target is DRAFT, records rejection reason
- `assign_task.py` — uses its own `AssignTaskRequest` (adds `assigned_to_id` field), sets `task.assigned_to`
- `start_task.py` — `_validate_actor` ensures the actor is the assignee (or admin/manager)
- `complete_task.py` — minimal, similar to approve
- `close_task.py` — minimal, similar to approve

### 8.3 The View Stays Thin

A workflow action in `TaskViewSet` looks like this:

```python
@action(detail=True, methods=['post'], permission_classes=[IsAuthenticated, CanApproveTask])
def approve(self, request, pk=None):
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
```

**No business logic in the view.** The view builds a request DTO, calls the use case, and serializes the result. If you need to change what "approve" means, you never touch the view.

---

## 9. Request Lifecycle — End-to-End Trace

Let's trace `POST /api/v1/tasks/{id}/approve/` with a MANAGER JWT. This one example exercises almost every layer.

```
┌─────────────────────────────────────────────────────────────────────┐
│ 1. Client                                                           │
│    POST /api/v1/tasks/<uuid>/approve/                               │
│    Authorization: Bearer <access_token>                             │
│    Body: {"reason": "Looks good"}                                   │
└──────────────────────┬──────────────────────────────────────────────┘
                       ▼
┌─────────────────────────────────────────────────────────────────────┐
│ 2. Django URL resolution                                            │
│    trackora/urls.py → apps/tasks/api/urls.py                        │
│    → DefaultRouter → TaskViewSet.approve                            │
└──────────────────────┬──────────────────────────────────────────────┘
                       ▼
┌─────────────────────────────────────────────────────────────────────┐
│ 3. Middleware chain (settings.MIDDLEWARE)                           │
│    CorsMiddleware → RateLimitMiddleware → Auth → RequestLogging →   │
│    CorrelationIdMiddleware (adds X-Correlation-ID)                  │
└──────────────────────┬──────────────────────────────────────────────┘
                       ▼
┌─────────────────────────────────────────────────────────────────────┐
│ 4. DRF — JWTAuthentication                                          │
│    Validates Bearer token → sets request.user                       │
│    (Fails here → 401 returned, trace ends)                          │
└──────────────────────┬──────────────────────────────────────────────┘
                       ▼
┌─────────────────────────────────────────────────────────────────────┐
│ 5. DRF — Permission check                                           │
│    [IsAuthenticated, CanApproveTask]                                │
│    CanApproveTask.has_permission → user has MANAGER role? yes.      │
│    (Fails → 403, trace ends)                                        │
└──────────────────────┬──────────────────────────────────────────────┘
                       ▼
┌─────────────────────────────────────────────────────────────────────┐
│ 6. TaskViewSet.approve()                                            │
│    Build WorkflowRequest(task_id, actor_id, actor_role, reason)     │
│    Call ApproveTaskUseCase().execute(request)                       │
└──────────────────────┬──────────────────────────────────────────────┘
                       ▼
┌─────────────────────────────────────────────────────────────────────┐
│ 7. WorkflowUseCase.execute — inside @transaction.atomic:            │
│    a. Task.objects.select_for_update().get(id=...)     [row locked] │
│    b. WorkflowEngine.validate_transition(                           │
│         PENDING_APPROVAL, APPROVED, MANAGER)            [OK]        │
│    c. _validate_prerequisites (approve: no extras)                  │
│    d. _validate_actor (approve: no extras)                          │
│    e. task.status = 'APPROVED'; task.save(update_fields=...)        │
│    f. TaskHistory.objects.create(...)              [audit row]      │
│    g. CacheService.invalidate_task_detail + task_stats              │
│    h. event_dispatcher.dispatch(TaskApprovedEvent)                  │
│    i. event_dispatcher.dispatch(TaskStatusChangedEvent)             │
│    (Any failure → rollback, exception bubbles up)                   │
└──────────────────────┬──────────────────────────────────────────────┘
                       ▼
┌─────────────────────────────────────────────────────────────────────┐
│ 8. Event handlers (sync, in-process)                                │
│    apps/notifications/event_handlers.handle_task_approved:          │
│    - Notification.objects.create(recipient=task.created_by, ...)    │
│    - TaskApprovedEvent is in _EMAIL_EVENTS →                        │
│      send_immediate_notification.delay(notification.id)             │
└──────────────────────┬──────────────────────────────────────────────┘
                       ▼
┌─────────────────────────────────────────────────────────────────────┐
│ 9. Celery worker (out of band)                                      │
│    Picks up task → honors email_frequency preference →              │
│    send_mail(...) via SMTP (or console in dev) → mark_email_sent()  │
└──────────────────────┬──────────────────────────────────────────────┘
                       ▼
┌─────────────────────────────────────────────────────────────────────┐
│ 10. Back in view                                                    │
│     task.refresh_from_db()                                          │
│     TaskDetailSerializer(task).data                                 │
│     Response(...) → 200 JSON                                        │
└─────────────────────────────────────────────────────────────────────┘
```

**If anything in step 7a–7f fails:** `apps/core/exception_handler.py` catches the domain exception and returns the right HTTP status + JSON body. Examples:
- Wrong status (e.g. task is DRAFT, not PENDING_APPROVAL) → `InvalidWorkflowTransitionError` → 409
- Title too short → `BusinessRuleViolation` → 400
- Task not found → `EntityNotFoundError` → 404
- Wrong role → `PermissionDeniedError` → 403

---

## 10. Authentication & Authorization

### 10.1 JWT Flow

```
POST /api/v1/auth/login/        {email, password}
  → 200 {access: "eyJ...", refresh: "eyJ..."}

# Use access token for all subsequent requests:
GET /api/v1/tasks/
  Authorization: Bearer eyJ...

# When access token expires (15 min):
POST /api/v1/auth/refresh/      {refresh: "eyJ..."}
  → 200 {access: "eyJ...", refresh: "eyJ..."}   (rotation enabled)

# Old refresh token is blacklisted → cannot be reused
POST /api/v1/auth/logout/       {refresh: "eyJ..."}
  → 204  (blacklists refresh)
```

Settings:
- `ACCESS_TOKEN_LIFETIME = 15 minutes`
- `REFRESH_TOKEN_LIFETIME = 7 days`
- `ROTATE_REFRESH_TOKENS = True` (each refresh issues a new refresh too)
- `BLACKLIST_AFTER_ROTATION = True` (old refresh becomes unusable)

### 10.2 Three-Layer Authorization

1. **`IsAuthenticated`** — "do you have a valid token?"
2. **DRF permission class** (e.g. `CanApproveTask`) — "can your role perform this action in general?"
3. **State machine role check** (`WorkflowEngine.validate_transition`) — "can your role pull this specific lever on this specific task?"

Defense in depth. Even if (1) and (2) are misconfigured, (3) stops illegal transitions at the domain layer.

---

## 11. Notifications & Events

### 11.1 Event Dispatch — How It Works

At app startup (`apps/notifications/apps.py` → `NotificationsConfig.ready()`), `register_handlers()` wires each handler to the singleton `event_dispatcher`:

```python
event_dispatcher.register_handler("TaskApprovedEvent", handle_task_approved)
event_dispatcher.register_handler("TaskAssignedEvent", handle_task_assigned)
# ... etc
```

When a use case calls `event_dispatcher.dispatch(event)`:
- The dispatcher looks up handlers for `event.event_type`
- Calls each one **synchronously**, in-process, wrapped in try/except
- A failing handler logs the error but doesn't break the caller

### 11.2 Two Notification Channels

| Channel | How | Events triggering it |
|---|---|---|
| **In-app** (`Notification` row) | Synchronous DB insert in handler | All events (per `_EVENT_CONFIG` in `event_handlers.py`) |
| **Email** | Celery task `send_immediate_notification.delay()` | Only 4 high-signal events in `_EMAIL_EVENTS`: `TaskAssignedEvent`, `TaskApprovedEvent`, `TaskRejectedEvent`, `SLABreachedEvent` |

Why gate email? Avoid email fatigue. Comments/attachments/status pings stay in-app only.

### 11.3 User Preferences

`NotificationPreference` has per-event opt-in booleans plus an overall `email_frequency`:
- `immediate` — send as the event happens
- `daily` — queued for the 9 AM digest
- `weekly` — skipped by `send_immediate_notification` (digest-only)
- `never` — no email, ever

The Celery task honors all of these; in-app rows are always created (they're cheap).

---

## 12. Celery Background Jobs

### 12.1 Architecture

```
┌─────────────┐   enqueue    ┌─────────┐   consume   ┌──────────┐
│ Django view │ ───────────▶ │  Redis  │ ──────────▶ │  Worker  │
└─────────────┘  (broker)    └─────────┘             └──────────┘
                                  ▲
                                  │ schedule
                             ┌────┴────┐
                             │  Beat   │
                             └─────────┘
```

- **Worker** — pulls tasks from Redis queue and runs them
- **Beat** — scheduler that pushes periodic tasks into the queue

### 12.2 Configured Tasks (`base.py` → `CELERY_BEAT_SCHEDULE`)

| Task | Schedule | Purpose |
|---|---|---|
| `apps.tasks.tasks.check_sla_breaches` | every 5 min | Scan IN_PROGRESS tasks past SLA → emit `SLABreachedEvent` |
| `apps.users.tasks.cleanup_old_tokens` | 2 AM daily | Remove blacklisted JWTs older than threshold |
| `apps.notifications.tasks.send_daily_digest` | 9 AM daily | Email summary of unread notifications for users with `email_frequency=daily` |

Plus ad-hoc tasks enqueued from code:
- `send_immediate_notification(notification_id)` — fires on high-signal events
- `cleanup_old_notifications` — manual cleanup

### 12.3 Running Locally

```powershell
celery -A trackora worker -l info
celery -A trackora beat -l info
```

### 12.4 In Tests

`settings/test.py` sets `CELERY_TASK_ALWAYS_EAGER = True`, which means `.delay()` runs synchronously in the same process. No broker needed. Email goes to `mail.outbox` (locmem backend). See §14.

---

## 13. Caching Strategy

### 13.1 What's Cached

| Key | Stored | TTL | Invalidated when |
|---|---|---|---|
| `task_detail:<uuid>` | Serialized task | 5 min | Any task update/transition |
| `task_stats:global` | Counts per status (all tasks) | 5 min | Any task create/update/transition |
| `task_stats:user:<uuid>` | Counts per status (this user's visible tasks) | 5 min | That user's tasks change |

### 13.2 Cache Key Flow for `GET /tasks/stats/`

```python
# In TaskViewSet.stats:
cached = CacheService.get_task_stats(user_id=user_id_for_cache)
if cached:
    return Response(cached)               # cache hit

stats = compute()                         # cache miss
CacheService.set_task_stats(stats, user_id=user_id_for_cache)
return Response(stats)
```

### 13.3 Backends

- **Development** — `django.core.cache.backends.locmem.LocMemCache` (per-process, no Redis needed)
- **Production** — `django_redis.cache.RedisCache` (shared, persistent)
- **Tests** — same as dev (locmem), isolated per test

---

## 14. Testing

### 14.1 Running Tests

```powershell
# All tests
venv\Scripts\python.exe -m pytest tests/

# Just unit (no DB)
venv\Scripts\python.exe -m pytest tests/unit/

# Just integration
venv\Scripts\python.exe -m pytest tests/integration/

# Verbose + specific file
venv\Scripts\python.exe -m pytest tests/integration/test_workflow.py -v
```

Config: `pytest.ini` sets `DJANGO_SETTINGS_MODULE=trackora.settings.test`.

### 14.2 Test Layout

```
tests/
├── conftest.py                           # fixtures: api_client, manager_user, contributor_user, ...
├── unit/
│   ├── test_domain_entities.py           # entity invariants (no DB)
│   ├── test_use_cases.py                 # use case logic with ORM
│   └── test_workflow_engine.py           # state machine transitions
└── integration/
    ├── test_auth_api.py                  # register/login/refresh
    ├── test_task_api.py                  # CRUD
    ├── test_workflow.py                  # full DRAFT→CLOSED + failure paths
    └── test_email_notifications.py       # event → email fan-out
```

### 14.3 Test Settings (`settings/test.py`)

- SQLite in-memory DB (fast)
- `CELERY_TASK_ALWAYS_EAGER = True` (synchronous task execution)
- `EMAIL_BACKEND = locmem` (captures mail to `django.core.mail.outbox`)
- `PASSWORD_HASHERS = [MD5]` (fast hashing — tests only)
- Throttling disabled
- Minimal logging

### 14.4 Current Status

**38 tests, all passing.** This includes 8 integration tests proving email fan-out works for the 4 high-signal events and doesn't fire for low-signal events.

### 14.5 CI (`.github/workflows/ci.yml`)

On every push/PR:
1. Set up Python 3.13
2. Install deps with pip cache (keyed on `requirements/test.txt`)
3. `manage.py check`
4. `makemigrations --check --dry-run` (migration drift guard — fails if models changed without a migration)
5. `pytest tests/` (scoped — avoids unrelated test files)
6. On failure: upload logs as artifact

---

## 15. API Reference Cheat Sheet

Base URL: `http://localhost:8000/api/v1/`
All protected endpoints require `Authorization: Bearer <access_token>`.

### Auth

| Method | Path | Notes |
|---|---|---|
| POST | `/auth/register/` | Public. Creates user. |
| POST | `/auth/login/` | Returns `{access, refresh}`. |
| POST | `/auth/refresh/` | Returns new `{access, refresh}`. Rotates. |
| POST | `/auth/logout/` | Blacklists refresh token. |

### Users & Roles (ADMIN only for writes)

| Method | Path |
|---|---|
| GET, POST | `/users/` |
| GET, PATCH, DELETE | `/users/{id}/` |
| GET, POST | `/roles/` |
| GET, POST | `/user-roles/` |

### Tasks

| Method | Path | Purpose |
|---|---|---|
| GET | `/tasks/` | List (filtered, paginated) |
| POST | `/tasks/` | Create (any authenticated user; status auto-set to DRAFT) |
| GET | `/tasks/{id}/` | Detail |
| PATCH | `/tasks/{id}/` | Update (CanEditTask) |
| DELETE | `/tasks/{id}/` | Soft delete (ADMIN) |
| POST | `/tasks/{id}/submit_for_approval/` | DRAFT → PENDING_APPROVAL |
| POST | `/tasks/{id}/approve/` | PENDING_APPROVAL → APPROVED |
| POST | `/tasks/{id}/reject/` | PENDING_APPROVAL → DRAFT (with reason) |
| POST | `/tasks/{id}/assign/` | Body: `{assigned_to_id, notes}` |
| POST | `/tasks/{id}/start/` | APPROVED → IN_PROGRESS (assignee only) |
| POST | `/tasks/{id}/complete/` | IN_PROGRESS → COMPLETED |
| POST | `/tasks/{id}/close/` | COMPLETED → CLOSED |
| GET | `/tasks/{id}/history/` | Immutable audit log |
| GET | `/tasks/stats/` | Role-aware counts (cached) |

**Filters** (query params): `?status=DRAFT&priority=HIGH&assigned_to=<uuid>&search=deploy&ordering=-created_at&page=2`

### Comments & Attachments

| Method | Path |
|---|---|
| GET, POST | `/comments/?task={uuid}` |
| GET, PATCH, DELETE | `/comments/{id}/` |
| GET, POST | `/attachments/?task={uuid}` |
| GET, DELETE | `/attachments/{id}/` |

### Notifications

| Method | Path |
|---|---|
| GET | `/notifications/` |
| POST | `/notifications/{id}/mark_read/` |
| POST | `/notifications/mark_all_read/` |
| GET, PATCH | `/notification-preferences/{id}/` |

### Health

| Path | Checks |
|---|---|
| `/health/` | Basic liveness |
| `/health/db/` | Database connection |
| `/health/redis/` | Cache backend |
| `/health/celery/` | Worker reachable |

### Docs

- `/api/schema/` — raw OpenAPI JSON
- `/api/docs/swagger/` — interactive Swagger UI
- `/api/docs/redoc/` — Redoc

---

## 16. Configuration & Environments

### 16.1 Settings Modules

```
trackora/settings/
├── base.py              # shared config
├── development.py       # DEBUG=True, console email, locmem cache, debug toolbar
├── test.py              # SQLite in-memory, eager Celery, locmem email
└── production.py        # SMTP, Redis, HTTPS, strict CORS
```

Which one loads is controlled by `DJANGO_SETTINGS_MODULE` env var, defaulting to `trackora.settings.development`.

### 16.2 `.env` Variables (see `.env.example`)

```ini
DEBUG=True
SECRET_KEY=<random-string>
ALLOWED_HOSTS=localhost,127.0.0.1

# Database (omit for SQLite fallback)
DATABASE_URL=postgres://user:pass@localhost:5432/trackora

# Redis
REDIS_URL=redis://localhost:6379/0
CELERY_BROKER_URL=redis://localhost:6379/0

# JWT
JWT_ACCESS_TOKEN_LIFETIME_MINUTES=15
JWT_REFRESH_TOKEN_LIFETIME_DAYS=7

# Email (prod SMTP)
EMAIL_BACKEND=django.core.mail.backends.smtp.EmailBackend
EMAIL_HOST=smtp.example.com
EMAIL_PORT=587
EMAIL_USE_TLS=True
EMAIL_HOST_USER=
EMAIL_HOST_PASSWORD=
DEFAULT_FROM_EMAIL=noreply@trackora.com

# CORS
CORS_ALLOWED_ORIGINS=http://localhost:3000

# Rate limiting
RATE_LIMIT_REQUESTS=300
RATE_LIMIT_WINDOW_SECONDS=60

# File uploads
MAX_UPLOAD_SIZE_MB=10
ALLOWED_FILE_TYPES=pdf,docx,xlsx,png,jpg,jpeg,txt

LOG_LEVEL=INFO
```

### 16.3 Notable Base Settings

- `AUTH_USER_MODEL = 'users.User'` (custom user with UUID PK)
- `DEFAULT_PAGINATION_CLASS = PageNumberPagination`, `PAGE_SIZE = 25`
- `DEFAULT_VERSIONING_CLASS = URLPathVersioning`, `DEFAULT_VERSION = 'v1'` — this is why URLs are `/api/v1/...`
- `DEFAULT_THROTTLE_RATES = {'anon': '100/hour', 'user': '1000/hour'}`
- `EXCEPTION_HANDLER = 'apps.core.exception_handler.custom_exception_handler'`
- Logging writes to `logs/trackora.log` as rotating JSON (10 MB × 5 files)

---

## 17. Deployment

### 17.1 Docker

```powershell
# From repo root
docker-compose up --build
```

`docker-compose.yml` spins up:
- `web` — Django + Gunicorn (via `Dockerfile`)
- `db` — Postgres
- `redis` — broker + cache
- `celery-worker` — background worker
- `celery-beat` — scheduler

Entrypoint (`docker/entrypoint.sh`): waits for DB, runs migrations, collects static, starts Gunicorn.

### 17.2 Production Checklist

1. Set `DJANGO_SETTINGS_MODULE=trackora.settings.production`
2. Strong `SECRET_KEY` (generate: `python -c "import secrets; print(secrets.token_urlsafe(64))"`)
3. `DEBUG=False`
4. Real `ALLOWED_HOSTS`
5. HTTPS-capable reverse proxy (nginx) in front of Gunicorn
6. Configured SMTP (not console)
7. Managed Postgres + Redis
8. `python manage.py collectstatic --noinput`
9. Run Celery worker + beat as separate services (systemd / supervisor / k8s)
10. Configure log aggregation to consume `logs/trackora.log` JSON

---

## 18. Troubleshooting

| Symptom | Likely cause | Fix |
|---|---|---|
| 401 on every request | Expired access token | Hit `/auth/refresh/` with the refresh token |
| 409 on workflow action | Task in wrong state, or role not allowed | Check `GET /tasks/{id}/` status; check user roles |
| 400 "Task title must be at least 10 characters" | Approval prerequisite | Update title to ≥10 chars |
| `/health/redis/` returns 503 | Redis not running | `docker-compose up redis` or `redis-server` |
| `/health/celery/` returns 503 | Worker not running | `celery -A trackora worker -l info` |
| Email not arriving in dev | Using console backend (by design) | Check terminal running `runserver` — email prints there |
| `CORS error` from frontend | Origin not in `CORS_ALLOWED_ORIGINS` | Add to `.env`; restart server |
| Tests fail with migration errors | Models changed, migration not made | `python manage.py makemigrations` |
| `InvalidWorkflowTransitionError` in logs | Expected — someone tried an illegal transition | No action needed |
| Notification created but email never sent | `email_frequency='never'` or `'weekly'`, or Celery not running | Check `NotificationPreference`; check worker |
| Rate limited (429) | Hit throttle limit | Wait, or adjust `RATE_LIMIT_REQUESTS` in `.env` |

---

## 19. Mental Model — How to Think About Changes

When you need to add or change behavior, **ask these questions in order**. The answer tells you which layer to touch.

### "I want to add a new workflow action (e.g. 'archive')"

1. Add `ARCHIVED` to `TaskStatus` enum (`domain/value_objects/enums.py`)
2. Add the transition to `WorkflowEngine.TRANSITIONS` (`domain/workflows/workflows.py`) with allowed roles
3. Add `TaskArchivedEvent` in `domain/events/domain_events.py`
4. Create `apps/tasks/usecases/archive_task.py` — 10 lines, extends `WorkflowUseCase`
5. Export it from `apps/tasks/usecases/__init__.py`
6. Add an `@action` method on `TaskViewSet` — 10 lines, same pattern as `approve`
7. Register a permission class in `apps/tasks/api/permissions.py` if needed
8. Register a handler in `apps/notifications/event_handlers.py` → update `_EVENT_CONFIG`
9. Add to `_EMAIL_EVENTS` if high-signal
10. Write tests: unit (workflow engine + use case) + integration (DRF client)

### "I want to change what 'approval' requires"

→ Modify `WorkflowValidator.validate_approval_prerequisites` in `domain/workflows/workflows.py`. Done. Every code path that approves goes through there.

### "I want to change what the GET /tasks/ response looks like"

→ `apps/tasks/api/serializers.py` (TaskListSerializer). No domain changes.

### "I want to change who can view what"

→ Option A: role-based → `apps/tasks/api/permissions.py`
→ Option B: queryset-based → `TaskViewSet.get_queryset()`

### "I want to add a new notification type"

→ Only need to touch `apps/notifications/event_handlers.py` → update `_EVENT_CONFIG`. If you want email too, add the event name to `_EMAIL_EVENTS`.

### "I want to cache a new query"

→ Add helpers to `infrastructure/cache/cache_service.py`. Call them in the view. Invalidate in the relevant use cases' `_invalidate_cache` override.

### "I want to add a background job"

→ New `@shared_task` in the relevant app's `tasks.py`. Add to `CELERY_BEAT_SCHEDULE` in `settings/base.py` if scheduled.

### The Golden Rules

1. **Business rules live in `domain/`.** Period. If you're putting `if status == X and role == Y` in a view, stop.
2. **Views are translators.** JSON in → use case → JSON out. Nothing else.
3. **Every state change emits a domain event.** Always. That's how notifications, audit sinks, and future extensions stay decoupled.
4. **Every use case is atomic.** Wrap in `@transaction.atomic`. Lock rows with `select_for_update()`.
5. **Use the exception handler.** Throw domain exceptions; let `apps/core/exception_handler.py` translate to HTTP.
6. **Test the domain layer first.** It has no Django dependency, so unit tests are fast and fearless.

---

## Appendix A: File Path Quick Reference

| I need to… | Path |
|---|---|
| Change a state transition rule | `domain/workflows/workflows.py` |
| Add a new task action | `apps/tasks/usecases/*.py` + `apps/tasks/api/views.py` |
| Change a response shape | `apps/tasks/api/serializers.py` |
| Change permission rules | `apps/tasks/api/permissions.py` |
| Add a DB field | `apps/tasks/models.py` → `manage.py makemigrations` |
| Tune caching | `infrastructure/cache/cache_service.py` |
| Add a notification | `apps/notifications/event_handlers.py` |
| Schedule a periodic job | `apps/*/tasks.py` + `settings/base.py` `CELERY_BEAT_SCHEDULE` |
| Configure email/DB/Redis | `trackora/settings/*.py` + `.env` |
| Add an error type | `domain/exceptions/domain_exceptions.py` + `apps/core/exception_handler.py` |
| Add a middleware | `apps/core/middleware/` + `settings/base.py` `MIDDLEWARE` |
| Debug a test | `tests/` with `pytest -vv -s` |
| See URL routing | `trackora/urls.py` → `apps/*/api/urls.py` |

## Appendix B: Commands Cheat Sheet

```powershell
# Dev server
python manage.py runserver

# Migrations
python manage.py makemigrations
python manage.py migrate

# Shell (with models loaded)
python manage.py shell

# Celery
celery -A trackora worker -l info
celery -A trackora beat -l info

# Tests
venv\Scripts\python.exe -m pytest tests/
venv\Scripts\python.exe -m pytest tests/integration/test_workflow.py -v

# OpenAPI schema
python manage.py spectacular --file schema.yml

# Create an admin user manually
python manage.py createsuperuser

# Inspect DB (SQLite dev fallback)
python manage.py dbshell

# Seed (repo-provided)
python create_superuser.py
```

## Appendix C: Further Reading in This Repo

- `README.md` — short overview
- `QUICK_START.md` — condensed setup
- `COMPLETION_CHECKLIST.md` — development status
- `PROJECT_ANALYSIS_REPORT.md` — historical architecture review
- `FIX_APPLIED.md`, `REDIS_CACHE_FIX.md` — specific bug-fix notes
- `docs/` — extended documentation

---

**End of documentation.** Keep this file open alongside the codebase for your first week. After that, §19 (the mental model) is what you'll come back to.
