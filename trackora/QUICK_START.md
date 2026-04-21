# 🚀 QUICK START - Get Up and Running in 5 Minutes

## ✅ Server is Already Running!

Your Django development server is currently running at:
```
http://localhost:8000/
```

## Step 1: Open Swagger Documentation (2 minutes)

Go to: **http://localhost:8000/api/docs/swagger/**

This is your interactive API documentation and testing tool.

## Step 2: Get Authentication Token (1 minute)

1. Find the **`POST /api/auth/login/`** endpoint in Swagger
2. Click "Try it out"
3. Enter the credentials:
   ```json
   {
     "email": "admin@trackora.local",
     "password": "admin123456"
   }
   ```
4. Click "Execute"
5. Copy the **`access`** token from the response

## Step 3: Authorize All Requests (1 minute)

1. Click the green **"Authorize"** button (lock icon) at the top
2. Paste your `access` token in the dialog
3. Click "Authorize"
4. Now all endpoints are accessible!

## Step 4: Create Your First Task (1 minute)

1. Find **`POST /api/tasks/`** endpoint
2. Click "Try it out"
3. Enter sample data:
   ```json
   {
     "title": "My First Task",
     "description": "Learning Django API",
     "priority": "HIGH"
   }
   ```
4. Click "Execute"
5. You should get a 201 response with your new task!

## Step 5: Explore More Endpoints

**Try these:**
- `GET /api/tasks/` - List all tasks
- `GET /api/tasks/{id}/` - Get specific task
- `PUT /api/tasks/{id}/` - Update a task
- `POST /api/tasks/{id}/comments/` - Add comment
- `POST /api/tasks/{id}/assign/` - Assign to someone

---

## 🎯 Common Actions

### View All Tasks
```
GET /api/tasks/
```

### Create a Task
```
POST /api/tasks/
Body:
{
  "title": "Task Title",
  "description": "Task description",
  "priority": "HIGH",  // or MEDIUM, LOW
  "status": "OPEN"     // or IN_PROGRESS, COMPLETED
}
```

### Update Task Status (Start Working)
```
POST /api/tasks/{id}/start/
```

### Complete a Task
```
POST /api/tasks/{id}/complete/
```

### Add a Comment
```
POST /api/tasks/{id}/comments/
Body:
{
  "content": "This is my comment"
}
```

---

## 📚 Want to Understand the Code?

### 1. Open Django Shell
```bash
python manage.py shell
```

Then:
```python
from apps.tasks.models import Task
from apps.users.models import User

# See all tasks
tasks = Task.objects.all()
print(f"Total tasks: {tasks.count()}")

# Get first task
task = Task.objects.first()
print(f"Task: {task.title}")
print(f"Status: {task.status}")

# Create a new task
user = User.objects.first()
new_task = Task.objects.create(
    title="Shell Test",
    description="Created from shell",
    created_by=user
)
print(f"Created: {new_task.title}")
```

### 2. Explore Models
Open in your IDE: `apps/tasks/models.py`

You'll see:
- `Task` - The main task model
- `Comment` - Comments on tasks
- `Attachment` - File uploads
- `Assignment` - Task assignments

### 3. Set a Breakpoint (Debug Code)
1. Open `apps/tasks/api/views.py` in your IDE
2. Click on line 50 (somewhere in the code)
3. A red circle appears (breakpoint set)
4. Make an API request in Swagger UI
5. Code execution stops at the breakpoint
6. Inspect variables, step through code

### 4. View Generated SQL
```bash
python manage.py shell
```

```python
from django.db import connection
from apps.tasks.models import Task

# Run a query
tasks = Task.objects.all()[:5]

# See the SQL
for query in connection.queries:
    print(query['sql'])
```

---

## 🔐 User Accounts

### Admin Account (Already Created)
```
Email:    admin@trackora.local
Password: admin123456
Role:     Super Admin
```

### Django Admin Panel
Go to: **http://localhost:8000/admin/**

Login with admin credentials above.

Create more users, manage permissions, view all data.

---

## 📂 Important Files

| File | Purpose |
|------|---------|
| `apps/tasks/models.py` | Database schema |
| `apps/tasks/api/views.py` | REST API endpoints |
| `apps/tasks/api/serializers.py` | Data validation |
| `.env` | Configuration (DB, secrets) |
| `manage.py` | Django CLI tool |

---

## 🆘 Need Help?

### Server won't start?
```bash
# Check if port 8000 is in use
netstat -ano | findstr :8000

# If in use, kill it:
taskkill /PID <PID> /F

# Then restart:
python manage.py runserver
```

### PostgreSQL connection error?
```bash
# Check connection string in .env
# Should be: postgresql://priyadharshiniramachandran034:taskiy034@localhost:5432/trackora

# Verify PostgreSQL is running:
psql -U postgres -c "SELECT 1"
```

### Import error?
```bash
# Install dependencies
pip install -r requirements/development.txt

# Restart server
python manage.py runserver
```

---

## 📊 Current Status

- ✅ PostgreSQL: Connected
- ✅ Django: Running (http://localhost:8000/)
- ✅ Database: Migrated (21 tables)
- ✅ API: Functional (23+ endpoints)
- ✅ Docs: Available (Swagger UI)
- ✅ Auth: Working (JWT)

---

## 🎓 Learning Path

**Hour 1 (Now):**
- [x] Server running
- [x] Access Swagger UI
- [x] Get JWT token
- [x] Create a test task

**Hour 2:**
- [ ] Read `apps/tasks/models.py`
- [ ] Explore database in shell
- [ ] View SQL queries
- [ ] Understand relationships

**Hour 3:**
- [ ] Read `apps/tasks/api/views.py`
- [ ] Set a breakpoint
- [ ] Debug a request
- [ ] Modify code

**Hour 4+:**
- [ ] Write a test
- [ ] Create new endpoint
- [ ] Add new feature
- [ ] Optimize query

---

## 🎉 You're Ready!

Everything is set up and running. Start exploring!

**Next step:** Open http://localhost:8000/api/docs/swagger/

---

**Need more details?** Read `SETUP_COMPLETE_REPORT.md`
