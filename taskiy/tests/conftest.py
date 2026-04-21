import pytest
from rest_framework.test import APIClient
from rest_framework_simplejwt.tokens import RefreshToken

from apps.users.models import User, Role, UserRole


@pytest.fixture
def api_client():
    return APIClient()


@pytest.fixture
def manager_role(db):
    return Role.objects.create(name="MANAGER", description="Manager role")


@pytest.fixture
def contributor_role(db):
    return Role.objects.create(name="CONTRIBUTOR", description="Contributor role")


@pytest.fixture
def manager_user(db, manager_role):
    user = User.objects.create_user(
        email="manager@example.com",
        password="StrongPass123!",
        first_name="Manager",
        last_name="User",
    )
    UserRole.objects.create(user=user, role=manager_role)
    return user


@pytest.fixture
def contributor_user(db, contributor_role):
    user = User.objects.create_user(
        email="contributor@example.com",
        password="StrongPass123!",
        first_name="Contributor",
        last_name="User",
    )
    UserRole.objects.create(user=user, role=contributor_role)
    return user


@pytest.fixture
def auth_client(api_client, manager_user):
    refresh = RefreshToken.for_user(manager_user)
    api_client.credentials(HTTP_AUTHORIZATION=f"Bearer {refresh.access_token}")
    return api_client

