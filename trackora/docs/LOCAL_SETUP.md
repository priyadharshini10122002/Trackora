# Running Trackora Locally (Without Docker)

This guide shows how to run Trackora on your local machine without Docker.

## Prerequisites

- Python 3.11+ installed
- PostgreSQL installed (or use SQLite for simplicity)
- Redis installed (optional - can disable caching initially)

## Quick Setup (SQLite - Simplest)

### 1. Create Virtual Environment

```bash
# Navigate to project
cd c:\Django_Refreshment\trackora

# Create virtual environment
python -m venv venv

# Activate virtual environment
.\venv\Scripts\activate
```

### 2. Install Dependencies

```bash
# Install development dependencies
pip install -r requirements/development.txt
```

### 3. Configure Environment Variables

Create a `.env` file in the `trackora` directory:

```bash
# Create .env file
copy .env.example .env
```

Edit `.env` and set these minimum values:

```env
DEBUG=True
SECRET_KEY=your-secret-key-here
DATABASE_URL=sqlite:///db.sqlite3
REDIS_URL=redis://localhost:6379/0

# Disable Celery for now (optional)
CELERY_BROKER_URL=
CELERY_RESULT_BACKEND=
```

### 4. Run Migrations

```bash
python manage.py migrate
```

### 5. Create Superuser

```bash
python manage.py createsuperuser
```

Follow the prompts to create an admin account.

### 6. Seed Database (Optional)

```bash
python scripts/seed_database.py
```

This creates sample users and tasks.

### 7. Run Development Server

```bash
python manage.py runserver
```

The API will be available at: **http://localhost:8000**

### 8. Access the Application

- **API Root**: http://localhost:8000/api/
- **Swagger UI**: http://localhost:8000/api/docs/swagger/
- **Admin Panel**: http://localhost:8000/admin
- **Health Check**: http://localhost:8000/health/

---

## Optional: Setup PostgreSQL

If you want to use PostgreSQL like in production:

### 1. Install PostgreSQL

Download from: https://www.postgresql.org/download/windows/

### 2. Create Database

```sql
CREATE DATABASE trackora_db;
CREATE USER trackora_user WITH PASSWORD 'your_password';
GRANT ALL PRIVILEGES ON DATABASE trackora_db TO trackora_user;
```

### 3. Update .env

```env
DATABASE_URL=postgresql://trackora_user:your_password@localhost:5432/trackora_db
```

---

## Optional: Setup Redis

Redis is used for caching. You can skip this initially.

### 1. Install Redis on Windows

**Option A: Windows Subsystem for Linux (WSL)**
```bash
wsl --install
# Then in WSL:
sudo apt-get update
sudo apt-get install redis-server
redis-server
```

**Option B: Memurai (Redis for Windows)**
Download from: https://www.memurai.com/get-memurai

### 2. Update .env

```env
REDIS_URL=redis://localhost:6379/0
```

---

## Optional: Setup Celery

Celery is used for background tasks (SLA checks, notifications).

### 1. Ensure Redis is Running

Celery needs a broker (Redis or RabbitMQ).

### 2. Run Celery Worker

In a new terminal (with venv activated):

```bash
# Activate venv
.\venv\Scripts\activate

# Run worker
celery -A trackora worker --loglevel=info --pool=solo
```

> **Note**: Use `--pool=solo` on Windows

### 3. Run Celery Beat (Scheduler)

In another terminal:

```bash
# Activate venv
.\venv\Scripts\activate

# Run beat
celery -A trackora beat --loglevel=info
```

---

## Simplified Development Workflow

For **learning purposes**, you can start with the simplest setup:

1. ✅ SQLite database (no PostgreSQL needed)
2. ✅ No Redis (caching will be disabled, but app works)
3. ✅ No Celery (no background tasks, but API works fine)

### Minimal .env Configuration

```env
DEBUG=True
SECRET_KEY=django-insecure-dev-key-change-in-production
DATABASE_URL=sqlite:///db.sqlite3

# Leave these empty to disable
REDIS_URL=
CELERY_BROKER_URL=
CELERY_RESULT_BACKEND=
```

With this setup:
- ✅ API works perfectly
- ✅ Authentication works
- ✅ All CRUD operations work
- ✅ Workflow engine works
- ❌ Caching is disabled (slower stats endpoint)
- ❌ Background tasks won't run (SLA checks, digests)

---

## Testing Without Docker

```bash
# Activate virtual environment
.\venv\Scripts\activate

# Run all tests
python -m pytest -v

# Run specific tests
python -m pytest tests/unit/ -v
python -m pytest tests/integration/ -v
```

---

## Common Issues

### Issue: "No module named 'decouple'"

**Solution**: Install dependencies
```bash
pip install -r requirements/development.txt
```

### Issue: "SECRET_KEY missing"

**Solution**: Create `.env` file with SECRET_KEY
```env
SECRET_KEY=any-random-string-here
```

### Issue: "Database connection error"

**Solution**: Use SQLite instead
```env
DATABASE_URL=sqlite:///db.sqlite3
```

### Issue: "Redis connection error"

**Solution**: Disable Redis temporarily
```env
REDIS_URL=
```

Or modify `trackora/settings/base.py` to use Django's default cache:

```python
CACHES = {
    'default': {
        'BACKEND': 'django.core.cache.backends.locmem.LocMemCache',
    }
}
```

---

## Next Steps

Once the app is running:

1. **Explore the API**: http://localhost:8000/api/docs/swagger/
2. **Follow the Learning Path**: See [LEARNING_PATH.md](file:///c:/Django_Refreshment/trackora/docs/LEARNING_PATH.md)
3. **Read the Architecture**: See [ARCHITECTURE.md](file:///c:/Django_Refreshment/trackora/docs/ARCHITECTURE.md)

---

## When to Use Docker

Use Docker when you want:
- ✅ Production-like environment
- ✅ All services (PostgreSQL, Redis, Celery) automatically
- ✅ No manual setup
- ✅ Easy deployment

For **learning the code**, local setup is often easier and faster!
