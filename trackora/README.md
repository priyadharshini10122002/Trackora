# Trackora

Production-ready Django REST API for task orchestration with workflow control, JWT auth, role-based permissions, notifications, caching, and async processing.

## Features

- JWT auth (`login`, `refresh`, `logout`, `register`)
- Role-based access control (`ADMIN`, `MANAGER`, `CONTRIBUTOR`, `VIEWER`)
- Task lifecycle workflow (`DRAFT -> PENDING_APPROVAL -> APPROVED -> IN_PROGRESS -> COMPLETED -> CLOSED`)
- Task history/audit trail, comments, attachments, assignments
- Notification center and user preferences
- Redis caching service and cache invalidation utilities
- Celery worker + beat for background jobs
- Health checks for app, DB, Redis, Celery
- OpenAPI schema and Swagger/ReDoc docs
- Dockerized deployment stack (web, worker, beat, Postgres, Redis)

## Tech Stack

- Python 3.11
- Django 5.1
- Django REST Framework
- PostgreSQL
- Redis
- Celery
- drf-spectacular
- gunicorn

## Quick Start (Docker)

1. Copy env template:

```bash
cp .env.example .env
```

2. Build and run:

```bash
docker compose up --build
```

3. API base URL:

- `http://localhost:8000/api/`
- Versioned API: `http://localhost:8000/api/v1/`

## API Documentation

- OpenAPI schema: `GET /api/schema/`
- Swagger UI: `GET /api/docs/swagger/`
- ReDoc: `GET /api/docs/redoc/`

## Core Endpoints

- `POST /api/auth/register/`
- `POST /api/auth/login/`
- `POST /api/auth/refresh/`
- `POST /api/auth/logout/`
- `GET|POST /api/tasks/`
- `GET /api/tasks/{id}/history/`
- `POST /api/tasks/{id}/submit_for_approval/`
- `POST /api/tasks/{id}/approve/`
- `POST /api/tasks/{id}/reject/`
- `POST /api/tasks/{id}/assign/`
- `POST /api/tasks/{id}/start/`
- `POST /api/tasks/{id}/complete/`
- `POST /api/tasks/{id}/close/`
- `GET /api/tasks/stats/`
- `GET|POST /api/comments/`
- `GET|POST /api/attachments/`
- `GET /api/notifications/`
- `POST /api/notifications/mark-read/`
- `POST /api/notifications/mark-all-read/`
- `GET /health/`, `GET /health/db/`, `GET /health/redis/`, `GET /health/celery/`

## Local Development (without Docker)

1. Create virtualenv and install dependencies from `requirements/development.txt`.
2. Set environment variables (`.env.example`).
3. Run migrations:

```bash
python manage.py migrate
```

4. Start API:

```bash
python manage.py runserver
```

5. Start Celery:

```bash
celery -A trackora worker --loglevel=info
celery -A trackora beat --loglevel=info
```

## Testing

Pytest config is in `pytest.ini`.

```bash
python -m pytest
```

## Load Testing

A Locust scaffold is available at `tests/performance/locustfile.py`.

```bash
locust -f tests/performance/locustfile.py --host=http://localhost:8000
```

## Production Notes

- Use `.env.production.example` as baseline.
- Set strong `SECRET_KEY`, production DB credentials, and SMTP credentials.
- Keep `DEBUG=False`.
- Deploy behind TLS reverse proxy.
- Ensure persistent volumes for Postgres and Redis.

