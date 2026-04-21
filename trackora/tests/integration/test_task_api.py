from datetime import timedelta

import pytest
from django.utils import timezone


@pytest.mark.django_db
def test_task_create_list_and_stats(auth_client):
    due_date = (timezone.now() + timedelta(days=2)).isoformat()
    payload = {
        "title": "Implement production deployment strategy",
        "description": "Create web/worker/beat container setup",
        "priority": "HIGH",
        "due_date": due_date,
        "sla_hours": 24,
    }

    create_response = auth_client.post("/api/tasks/", payload, format="json")
    assert create_response.status_code == 201

    list_response = auth_client.get("/api/tasks/")
    assert list_response.status_code == 200
    assert list_response.data["count"] >= 1

    stats_response = auth_client.get("/api/tasks/stats/")
    assert stats_response.status_code == 200
    assert "total" in stats_response.data

