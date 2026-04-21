from django.urls import reverse

import pytest


@pytest.mark.django_db
def test_register_login_refresh_flow(api_client):
    register_payload = {
        "email": "newuser@example.com",
        "first_name": "New",
        "last_name": "User",
        "password": "StrongPass123!",
        "password_confirm": "StrongPass123!",
    }
    register_response = api_client.post("/api/auth/register/", register_payload, format="json")
    assert register_response.status_code == 201
    assert "tokens" in register_response.data

    login_payload = {
        "email": "newuser@example.com",
        "password": "StrongPass123!",
    }
    login_response = api_client.post("/api/auth/login/", login_payload, format="json")
    assert login_response.status_code == 200
    assert "access" in login_response.data
    assert "refresh" in login_response.data

    refresh_response = api_client.post(
        "/api/auth/refresh/",
        {"refresh": login_response.data["refresh"]},
        format="json",
    )
    assert refresh_response.status_code == 200
    assert "access" in refresh_response.data

