# Trackora - API Usage Guide

## Quick Start

### 1. Setup and Run

```bash
# Using Docker (Recommended)
docker compose up --build

# API available at: http://localhost:8000/api/v1/
```

### 2. API Documentation

- **Swagger UI**: http://localhost:8000/api/docs/swagger/
- **ReDoc**: http://localhost:8000/api/docs/redoc/
- **OpenAPI Schema**: http://localhost:8000/api/schema/

---

## Authentication Flow

### Register a New User

```bash
POST /api/auth/register/
Content-Type: application/json

{
  "email": "john@example.com",
  "password": "SecurePass123!",
  "first_name": "John",
  "last_name": "Doe"
}
```

**Response**:
```json
{
  "user": {
    "id": "uuid-here",
    "email": "john@example.com",
    "first_name": "John",
    "last_name": "Doe",
    "roles": ["VIEWER"]
  },
  "tokens": {
    "access": "eyJ0eXAiOiJKV1QiLCJhbGc...",
    "refresh": "eyJ0eXAiOiJKV1QiLCJhbGc..."
  }
}
```

### Login

```bash
POST /api/auth/login/
Content-Type: application/json

{
  "email": "john@example.com",
  "password": "SecurePass123!"
}
```

**Response**: Same as register (tokens + user info)

### Refresh Token

```bash
POST /api/auth/refresh/
Content-Type: application/json

{
  "refresh": "your-refresh-token-here"
}
```

**Response**:
```json
{
  "access": "new-access-token",
  "refresh": "new-refresh-token"
}
```

### Logout

```bash
POST /api/auth/logout/
Authorization: Bearer your-access-token
Content-Type: application/json

{
  "refresh_token": "your-refresh-token-here"
}
```

---

## Task Management

### Create a Task

```bash
POST /api/v1/tasks/
Authorization: Bearer your-access-token
Content-Type: application/json

{
  "title": "Implement user authentication",
  "description": "Add JWT-based authentication to the API",
  "priority": "HIGH",
  "due_date": "2026-03-01T12:00:00Z"
}
```

**Response**:
```json
{
  "id": "task-uuid",
  "title": "Implement user authentication",
  "description": "Add JWT-based authentication to the API",
  "status": "DRAFT",
  "priority": "HIGH",
  "created_by": {...},
  "assigned_to": null,
  "due_date": "2026-03-01T12:00:00Z",
  "created_at": "2026-02-12T12:00:00Z",
  "updated_at": "2026-02-12T12:00:00Z"
}
```

### List Tasks

```bash
# Get all tasks (filtered based on role)
GET /api/v1/tasks/
Authorization: Bearer your-access-token

# Filter by status
GET /api/v1/tasks/?status=DRAFT

# Filter by assignee
GET /api/v1/tasks/?assigned_to=user-uuid

# Search
GET /api/v1/tasks/?search=authentication

# Order by
GET /api/v1/tasks/?ordering=-created_at

# Pagination
GET /api/v1/tasks/?page=2
```

### Get Task Detail

```bash
GET /api/v1/tasks/{task_id}/
Authorization: Bearer your-access-token
```

### Update Task

```bash
PATCH /api/v1/tasks/{task_id}/
Authorization: Bearer your-access-token
Content-Type: application/json

{
  "title": "Updated title",
  "description": "Updated description"
}
```

---

## Task Workflow Actions

### Submit for Approval

```bash
POST /api/v1/tasks/{task_id}/submit_for_approval/
Authorization: Bearer your-access-token
Content-Type: application/json

{
  "reason": "Ready for manager review"
}
```

**Requirements**:
- Task must be in DRAFT status
- User must have CONTRIBUTOR role or higher

### Approve Task

```bash
POST /api/v1/tasks/{task_id}/approve/
Authorization: Bearer your-access-token
Content-Type: application/json

{
  "reason": "Looks good, approved!"
}
```

**Requirements**:
- Task must be in PENDING_APPROVAL status
- User must have MANAGER or ADMIN role

### Reject Task

```bash
POST /api/v1/tasks/{task_id}/reject/
Authorization: Bearer your-access-token
Content-Type: application/json

{
  "reason": "Needs more details"
}
```

**Requirements**:
- Task must be in PENDING_APPROVAL status
- User must have MANAGER or ADMIN role

### Assign Task

```bash
POST /api/v1/tasks/{task_id}/assign/
Authorization: Bearer your-access-token
Content-Type: application/json

{
  "assigned_to_id": "user-uuid",
  "notes": "Please work on this ASAP"
}
```

**Requirements**:
- User must have MANAGER or ADMIN role

### Start Task

```bash
POST /api/v1/tasks/{task_id}/start/
Authorization: Bearer your-access-token
```

**Requirements**:
- Task must be APPROVED
- Task must be assigned to a user

### Complete Task

```bash
POST /api/v1/tasks/{task_id}/complete/
Authorization: Bearer your-access-token
```

**Requirements**:
- Task must be IN_PROGRESS
- User must be the assigned user

### Close Task

```bash
POST /api/v1/tasks/{task_id}/close/
Authorization: Bearer your-access-token
```

**Requirements**:
- Task must be COMPLETED
- User must have MANAGER or ADMIN role

---

## Task History

### Get Task History

```bash
GET /api/v1/tasks/{task_id}/history/
Authorization: Bearer your-access-token
```

**Response**:
```json
[
  {
    "id": "uuid",
    "task": "task-uuid",
    "old_status": "DRAFT",
    "new_status": "PENDING_APPROVAL",
    "changed_by": {...},
    "reason": "Ready for review",
    "timestamp": "2026-02-12T12:00:00Z"
  }
]
```

---

## Comments

### Add Comment to Task

```bash
POST /api/v1/comments/
Authorization: Bearer your-access-token
Content-Type: application/json

{
  "task": "task-uuid",
  "content": "This needs to be done by Friday",
  "is_internal": false
}
```

### List Comments for Task

```bash
GET /api/v1/comments/?task={task_id}
Authorization: Bearer your-access-token
```

---

## Attachments

### Upload Attachment

```bash
POST /api/v1/attachments/
Authorization: Bearer your-access-token
Content-Type: multipart/form-data

task=task-uuid
file=@/path/to/file.pdf
```

### List Attachments for Task

```bash
GET /api/v1/attachments/?task={task_id}
Authorization: Bearer your-access-token
```

---

## Notifications

### Get My Notifications

```bash
GET /api/v1/notifications/
Authorization: Bearer your-access-token

# Filter unread only
GET /api/v1/notifications/?is_read=false
```

### Mark Notification as Read

```bash
POST /api/v1/notifications/mark-read/
Authorization: Bearer your-access-token
Content-Type: application/json

{
  "notification_ids": ["uuid1", "uuid2"]
}
```

### Mark All as Read

```bash
POST /api/v1/notifications/mark-all-read/
Authorization: Bearer your-access-token
```

---

## User Management

### Get My Profile

```bash
GET /api/v1/users/me/
Authorization: Bearer your-access-token
```

### Update My Profile

```bash
PUT /api/v1/users/update_profile/
Authorization: Bearer your-access-token
Content-Type: application/json

{
  "first_name": "John",
  "last_name": "Doe Updated"
}
```

### Change Password

```bash
POST /api/v1/users/change_password/
Authorization: Bearer your-access-token
Content-Type: application/json

{
  "old_password": "OldPass123!",
  "new_password": "NewSecurePass123!"
}
```

---

## Role Management (Admin/Manager Only)

### List All Roles

```bash
GET /api/v1/roles/
Authorization: Bearer your-access-token
```

### Assign Role to User

```bash
POST /api/v1/user-roles/assign_role/
Authorization: Bearer your-access-token
Content-Type: application/json

{
  "user_id": "user-uuid",
  "role_name": "MANAGER"
}
```

### Revoke Role

```bash
DELETE /api/v1/user-roles/{user_role_id}/revoke_role/
Authorization: Bearer your-access-token
```

---

## Statistics

### Get Task Statistics

```bash
GET /api/v1/tasks/stats/
Authorization: Bearer your-access-token
```

**Response** (cached for 30 minutes):
```json
{
  "total": 45,
  "draft": 5,
  "pending_approval": 8,
  "approved": 3,
  "in_progress": 12,
  "completed": 10,
  "closed": 7
}
```

---

## Health Checks

### Application Health

```bash
GET /health/
```

### Database Health

```bash
GET /health/db/
```

### Redis Health

```bash
GET /health/redis/
```

### Celery Health

```bash
GET /health/celery/
```

---

## Error Responses

All errors follow a consistent format:

```json
{
  "error": "Error message here",
  "details": {
    "field_name": ["Specific error for this field"]
  }
}
```

**Common HTTP Status Codes**:
- `200 OK` - Success
- `201 Created` - Resource created
- `400 Bad Request` - Invalid input
- `401 Unauthorized` - Missing/invalid token
- `403 Forbidden` - Insufficient permissions
- `404 Not Found` - Resource not found
- `429 Too Many Requests` - Rate limit exceeded
- `500 Internal Server Error` - Server error

---

## Pagination

All list endpoints return paginated results:

```json
{
  "count": 100,
  "next": "http://localhost:8000/api/v1/tasks/?page=2",
  "previous": null,
  "results": [...]
}
```

**Page size**: 25 items per page (configurable)

---

## Complete Workflow Example

Here's a complete task lifecycle:

```bash
# 1. Register and login
POST /api/auth/register/ → Get tokens

# 2. Create a task (becomes DRAFT)
POST /api/v1/tasks/ → task_id

# 3. Submit for approval  
POST /api/v1/tasks/{task_id}/submit_for_approval/ → status: PENDING_APPROVAL

# 4. Manager approves
POST /api/v1/tasks/{task_id}/approve/ → status: APPROVED

# 5. Assign to user
POST /api/v1/tasks/{task_id}/assign/ → assigned_to set

# 6. User starts work
POST /api/v1/tasks/{task_id}/start/ → status: IN_PROGRESS

# 7. User completes
POST /api/v1/tasks/{task_id}/complete/ → status: COMPLETED

# 8. Manager closes
POST /api/v1/tasks/{task_id}/close/ → status: CLOSED

# 9. View complete history
GET /api/v1/tasks/{task_id}/history/ → All state changes
```

---

## Testing with Postman

A Postman collection is included at `/postman_collection.json`.

**Import steps**:
1. Open Postman
2. Import → `trackora/postman_collection.json`
3. Set environment variable `base_url` = `http://localhost:8000`
4. Set environment variable `access_token` after login

---

## Next Steps

- Review [ARCHITECTURE.md](file:///c:/Django_Refreshment/trackora/docs/ARCHITECTURE.md) for system design
- Follow [LEARNING_PATH.md](file:///c:/Django_Refreshment/trackora/docs/LEARNING_PATH.md) for guided exploration
