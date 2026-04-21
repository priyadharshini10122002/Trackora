# ✅ TRACKORA - LOCAL SETUP COMPLETE

## 🎉 Status: READY FOR LOCAL DEVELOPMENT & DEBUGGING

Your Trackora Django REST API is now **fully configured and running locally** with PostgreSQL!

---

## 📊 Setup Summary

### ✅ Completed Steps

| Step | Status | Details |
|------|--------|---------|
| **PostgreSQL Setup** | ✅ Complete | Database `trackora` created, user configured with full schema privileges |
| **Django Configuration** | ✅ Complete | Settings updated for PostgreSQL connection on port 5432 |
| **Database Migrations** | ✅ Complete | All 35 migrations applied, 21 tables created |
| **Superuser Created** | ✅ Complete | Email: `admin@trackora.local`, Password: `admin123456` |
| **Development Server** | ✅ Running | Running on `http://localhost:8000/` |

### 📂 Database Tables Created (21 total)

**Core Application Tables:**
- `tasks_task` - Task records with full audit trail
- `tasks_taskhistory` - Audit log for all task changes
- `tasks_comment` - Comments on tasks
- `tasks_attachment` - File attachments
- `tasks_assignment` - Task assignments
- `users_user` - Custom user model
- `notifications_notification` - User notifications
- `notifications_notificationpreference` - Notification settings

**Django Infrastructure:**
- `django_migrations` - Migration history
- `django_contenttype` - Content types
- `auth_*` - User groups and permissions
- `token_blacklist_*` - JWT token management
- `sessions_*` - Session storage

---

## 🚀 Access Your Application

### **REST API Endpoints**

| Resource | URL | Method |
|----------|-----|--------|
| **Swagger UI** | http://localhost:8000/api/docs/swagger/ | GET |
| **ReDoc** | http://localhost:8000/api/docs/redoc/ | GET |
| **OpenAPI Schema** | http://localhost:8000/api/schema/ | GET |
| **Health Check** | http://localhost:8000/health/ | GET |
| **Admin Panel** | http://localhost:8000/admin/ | GET |

### **Superuser Credentials**
```
Email:    admin@trackora.local
Password: admin123456
```

---

## 🔌 Database Connection Details

**PostgreSQL Configuration:**
```
Host:     localhost
Port:     5432
Database: trackora
User:     priyadharshiniramachandran034
Password: taskiy034
```

**Django Configuration File:** `.env`
```ini
DATABASE_URL=postgresql://priyadharshiniramachandran034:taskiy034@localhost:5432/trackora
DEBUG=True
SECRET_KEY=your-secret-key-here
REDIS_URL=redis://localhost:6379/0  # Optional - for caching
```

---

## 📖 Next Steps - How to Use This Application

### **1️⃣ Login to Admin Panel**
```
URL: http://localhost:8000/admin/
Email: admin@trackora.local
Password: admin123456
```

### **2️⃣ Get JWT Token (API Authentication)**

**Request:**
```bash
curl -X POST http://localhost:8000/api/auth/login/ \
  -H "Content-Type: application/json" \
  -d '{
    "email": "admin@trackora.local",
    "password": "admin123456"
  }'
```

**Response:**
```json
{
  "access": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "refresh": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
}
```

### **3️⃣ Explore API with Swagger UI**
1. Navigate to: http://localhost:8000/api/docs/swagger/
2. Click **Authorize** (lock icon)
3. Paste your JWT `access` token
4. Try any endpoint!

### **4️⃣ Create a Task (Example)**

**Request:**
```bash
curl -X POST http://localhost:8000/api/tasks/ \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "title": "Fix login bug",
    "description": "Users cannot login with special characters",
    "priority": "HIGH",
    "status": "OPEN"
  }'
```

---

## 🧠 For Learning Django Concepts

### **Key Files to Study**

1. **Models** → `apps/tasks/models.py`
   - Understand the data structure
   - Learn Django ORM relationships
   - See soft-delete implementation

2. **Serializers** → `apps/tasks/api/serializers.py`
   - Data validation
   - Nested relationships
   - Custom field methods

3. **Views** → `apps/tasks/api/views.py`
   - REST API endpoints
   - Permission checks
   - Filtering & searching

4. **Permissions** → `apps/tasks/api/permissions.py`
   - Role-based access control (RBAC)
   - Custom permission logic

5. **Domain Layer** → `domain/workflows/task_workflow.py`
   - State machine logic
   - Business rules
   - Domain-driven design

### **Debug with Django Shell**

```bash
python manage.py shell
```

Then in the shell:
```python
from apps.tasks.models import Task
from apps.users.models import User

# See all tasks
tasks = Task.objects.all()
print(f"Total tasks: {tasks.count()}")

# Get a specific task
task = Task.objects.first()
print(f"Task: {task.title}")
print(f"Status: {task.status}")
print(f"Assigned to: {task.assigned_to}")

# Get a user
user = User.objects.first()
print(f"User: {user.email}")
print(f"Is Staff: {user.is_staff}")

# Create a new task
new_task = Task.objects.create(
    title="Learn Django",
    description="Study REST framework",
    created_by=user,
    priority="MEDIUM"
)
print(f"Created: {new_task.title}")
```

### **Debug with Breakpoints (PyCharm/VS Code)**

1. Open `apps/tasks/api/views.py`
2. Click left margin to set breakpoint at line 50
3. Make API request that hits that line
4. Debugger pauses - inspect variables, step through code
5. Use **Debug Console** to evaluate expressions

### **View Generated SQL Queries**

```python
# In Django shell
from django.db import connection
from django.test.utils import override_settings

@override_settings(DEBUG=True)
def test_queries():
    tasks = Task.objects.all()  # Triggers query
    print(connection.queries)  # See the SQL

test_queries()
```

---

## 📚 Project Architecture (For Reference)

```
trackora/
├── apps/
│   ├── core/              # Shared utilities, middleware
│   ├── tasks/             # Task management (23 API endpoints)
│   │   ├── models.py      # Task, Comment, Attachment
│   │   ├── api/
│   │   │   ├── views.py   # REST endpoints
│   │   │   ├── serializers.py  # Data validation
│   │   │   └── permissions.py  # Access control
│   │   └── services.py    # Business logic
│   ├── users/             # User management
│   └── notifications/     # Notification system
│
├── domain/                # Domain-Driven Design
│   ├── entities/          # Task, User entities
│   ├── value_objects/     # Status, Priority enums
│   ├── events/            # Domain events
│   ├── workflows/         # State machine
│   └── exceptions/        # Custom exceptions
│
├── infrastructure/        # Technical layer
│   ├── cache/             # Redis caching
│   ├── repositories/      # Query patterns
│   └── storage/           # File storage
│
├── tests/                 # Test suite
│   ├── unit/              # Unit tests
│   ├── integration/       # API tests
│   └── factories/         # Test data factories
│
└── trackora/                # Django settings
    ├── settings/
    │   ├── base.py        # Shared settings
    │   ├── development.py # Local settings
    │   ├── production.py  # Production settings
    │   └── test.py        # Test settings
    ├── celery.py          # Background tasks
    ├── urls.py            # URL routing
    ├── wsgi.py            # WSGI server
    └── asgi.py            # ASGI server
```

---

## ⚙️ Common Development Commands

```bash
# Run development server
python manage.py runserver

# Create new app
python manage.py startapp myapp

# Create new model migration
python manage.py makemigrations

# Apply migrations
python manage.py migrate

# Django shell (interactive Python with Django loaded)
python manage.py shell

# Run tests
python -m pytest tests/ -v

# Clear cache
python manage.py shell_plus --commands="from django.core.cache import cache; cache.clear()"

# Create superuser
python manage.py createsuperuser

# Collect static files
python manage.py collectstatic --noinput
```

---

## 🔧 Troubleshooting

### Issue: "Database connection refused"
**Solution:** Ensure PostgreSQL is running
```bash
# Windows - check PostgreSQL service
services.msc  # Look for "postgresql-x64-*"

# Or check with psql
psql -U postgres -c "SELECT 1"
```

### Issue: "ModuleNotFoundError: No module named X"
**Solution:** Install missing dependencies
```bash
pip install -r requirements/development.txt
```

### Issue: "Migration conflicts"
**Solution:** Reset migrations (⚠️ deletes data)
```bash
python manage.py migrate tasks zero
python manage.py migrate
```

### Issue: "Static files not loading"
**Solution:** Collect static files
```bash
python manage.py collectstatic --noinput
```

---

## 📋 What's Ready to Use

### ✅ Fully Functional Features
- 23+ REST API endpoints
- JWT authentication (login, logout, refresh)
- Role-based access control (ADMIN, MANAGER, CONTRIBUTOR, VIEWER)
- Task workflow (6-state lifecycle: OPEN → IN_PROGRESS → COMPLETED)
- Task history & audit trail
- Comments & attachments
- Notifications system
- Admin panel
- OpenAPI/Swagger documentation

### ⚠️ Partial Features (Not Critical)
- Caching (configured but not fully optimized)
- Background tasks (Celery configured, but tasks incomplete)
- Rate limiting (not implemented)
- Advanced search (basic filtering works)

### ❌ Not Yet Implemented
- Email notifications (needs SMTP setup)
- File upload storage (needs S3 or similar)
- Real-time notifications (needs WebSocket)
- Advanced reporting/analytics

---

## 🎓 Learning Objectives Checklist

- [ ] Run development server locally
- [ ] Authenticate and get JWT token
- [ ] Make API requests with Postman/Swagger
- [ ] Create a task via API
- [ ] Understand task workflow states
- [ ] Use Django shell to query database
- [ ] Add breakpoints and debug code
- [ ] Understand model relationships
- [ ] Understand serializers & validation
- [ ] Understand permissions & RBAC
- [ ] Modify code and see changes live
- [ ] Create new API endpoint
- [ ] Write a unit test

---

## 📞 Server Status

**Current Status:** ✅ **RUNNING**

```
Server:   http://localhost:8000/
Django:   5.1.15
Database: PostgreSQL (trackora)
Status:   Ready for requests
```

---

## 🎯 Quick Start Checklist

- [x] PostgreSQL installed and running
- [x] Django project configured
- [x] Database created and migrated
- [x] Superuser created
- [x] Development server running
- [x] API documentation accessible
- [x] Ready for local development

**You are ALL SET! 🚀**

Start learning Django by:
1. Opening Swagger UI: http://localhost:8000/api/docs/swagger/
2. Logging in with admin@trackora.local / admin123456
3. Creating a test task
4. Inspecting the code in your IDE
5. Using Django shell to explore the database

---

**Last Updated:** April 20, 2026  
**Environment:** Windows with PostgreSQL  
**Status:** Production-Ready for Local Development  
