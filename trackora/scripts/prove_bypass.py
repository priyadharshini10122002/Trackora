"""
Regression guard: TaskViewSet.submit_for_approval must NOT bypass
WorkflowValidator prerequisites.

Historical context:
  The original view bypassed the use case and updated task.status directly,
  letting a task with title='short' and sla_hours=0 transition into
  PENDING_APPROVAL via HTTP.

  After the Clean-Architecture refactor, the view delegates to
  SubmitForApprovalUseCase which enforces
  validate_approval_prerequisites. This script proves the bug is fixed.

Exit codes:
  0 - Bug is fixed (API rejected the bad task AND use case rejected it).
  1 - Bug has regressed (API accepted the bad task, or env is missing).

Run from: C:\\Django_Refreshment\\trackora
  venv\\Scripts\\python.exe scripts\\prove_bypass.py
"""
import os
import sys
import django
from datetime import timedelta

sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'trackora.settings.development')
django.setup()

import requests
from django.contrib.auth import get_user_model
from django.utils import timezone
from apps.tasks.models import Task
from domain.value_objects.enums import TaskStatus, UserRole as UserRoleEnum
from apps.tasks.usecases.submit_for_approval import (
    SubmitForApprovalUseCase,
    SubmitForApprovalRequest,
)

BASE = "http://localhost:8000"
User = get_user_model()


def banner(text):
    print("\n" + "=" * 70)
    print(text)
    print("=" * 70)


def login(email, password):
    r = requests.post(
        f"{BASE}/api/v1/auth/login/",
        json={"email": email, "password": password},
        timeout=10,
    )
    r.raise_for_status()
    return r.json()["access"]


def main():
    banner("Regression guard: API must reject tasks that violate prerequisites")

    manager = User.objects.filter(email="manager@trackora.com").first()
    if not manager:
        print("ERROR: manager@trackora.com not found. Run seed_database.py first.")
        return 1

    # Clean up any previous run
    Task.all_objects.filter(title="short").delete()

    print("  Creating a task with BAD data:")
    print("    title = 'short'   (violates >=10 chars)")
    print("    sla_hours = 0     (violates >0)")

    bad_task = Task.objects.create(
        title="short",
        description="demo",
        priority="MEDIUM",
        status=TaskStatus.DRAFT.value,
        due_date=timezone.now() + timedelta(days=1),
        sla_hours=1,
        created_by=manager,
    )
    Task.objects.filter(id=bad_task.id).update(sla_hours=0)
    bad_task.refresh_from_db()
    print(f"  Created task id={bad_task.id}")

    banner("STEP A: Submit via API")
    try:
        token = login("manager@trackora.com", "Manager123!")
    except Exception as e:
        print(f"  ERROR: could not log in (server on :8000?): {e}")
        Task.all_objects.filter(id=bad_task.id).delete()
        return 1

    r = requests.post(
        f"{BASE}/api/v1/tasks/{bad_task.id}/submit_for_approval/",
        headers={"Authorization": f"Bearer {token}"},
        json={"reason": "demo"},
        timeout=10,
    )
    print(f"  HTTP {r.status_code}")
    try:
        print(f"  Body: {r.json()}")
    except Exception:
        print(f"  Body (raw): {r.text[:300]}")

    bad_task.refresh_from_db()
    print(f"  Task status after call: {bad_task.status}")

    api_ok = (
        r.status_code == 400
        and bad_task.status == TaskStatus.DRAFT.value
    )
    if api_ok:
        print("  PASS: API rejected the bad task with 400 and status stayed DRAFT.")
    else:
        print("  FAIL: API did not enforce prerequisites.")
        print("        Expected HTTP 400 and status=DRAFT.")

    banner("STEP B: Call use case directly")
    use_case = SubmitForApprovalUseCase()
    usecase_rejected = False
    try:
        use_case.execute(
            SubmitForApprovalRequest(
                task_id=bad_task.id,
                submitted_by_id=manager.id,
                user_role=UserRoleEnum.MANAGER,
            )
        )
        print("  FAIL: Use case accepted the bad task.")
    except Exception as e:
        usecase_rejected = True
        print(f"  PASS: Use case raised {type(e).__name__}: {e}")

    banner("CLEANUP")
    Task.all_objects.filter(id=bad_task.id).delete()
    print("  Removed test task.")

    banner("RESULT")
    if api_ok and usecase_rejected:
        print("  ALL GOOD: bypass is fixed at both the API and use-case layers.")
        return 0
    print("  REGRESSION: prerequisites enforcement is broken somewhere.")
    return 1


if __name__ == "__main__":
    sys.exit(main())
