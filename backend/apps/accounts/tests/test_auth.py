"""
SIA HMS — Auth Tests
Tests for login, token refresh, and user profile endpoints.
"""

import pytest
from rest_framework import status
from rest_framework.test import APIClient
from django.urls import reverse
from apps.accounts.models import User, UserRole

pytestmark = pytest.mark.django_db


@pytest.fixture
def api_client():
    return APIClient(HTTP_HOST="localhost")


@pytest.fixture
def create_user():
    def make_user(**kwargs):
        defaults = {
            "password": "Password123!",
            "first_name": "Test",
            "last_name": "User",
        }
        defaults.update(kwargs)
        password = defaults.pop("password")
        user = User.objects.create(**defaults)
        user.set_password(password)
        user.save()
        return user

    return make_user


class TestAuthEndpoints:

    def test_login_success(self, api_client, create_user):
        user = create_user(
            email="manager@hotel.com",
            username="manager@hotel.com",
            role=UserRole.PROPERTY_MANAGER,
        )
        url = reverse("auth-login")
        response = api_client.post(
            url, {"email": "manager@hotel.com", "password": "Password123!"}
        )

        assert response.status_code == status.HTTP_200_OK
        assert "access" in response.data
        assert "refresh" in response.data
        assert "user" in response.data
        assert response.data["user"]["email"] == "manager@hotel.com"
        assert response.data["user"]["role"] == UserRole.PROPERTY_MANAGER

    def test_login_invalid_credentials(self, api_client, create_user):
        create_user(email="manager@hotel.com", username="manager@hotel.com")
        url = reverse("auth-login")
        response = api_client.post(
            url, {"email": "manager@hotel.com", "password": "WrongPassword!"}
        )

        assert response.status_code == status.HTTP_401_UNAUTHORIZED
        assert response.data["code"] == "AUTHENTICATION_ERROR"

    def test_token_refresh(self, api_client, create_user):
        create_user(email="manager@hotel.com", username="manager@hotel.com")
        
        # Get tokens
        login_resp = api_client.post(
            reverse("auth-login"),
            {"email": "manager@hotel.com", "password": "Password123!"},
        )
        refresh_token = login_resp.data["refresh"]

        # Refresh
        refresh_resp = api_client.post(
            reverse("auth-refresh"), {"refresh": refresh_token}
        )
        assert refresh_resp.status_code == status.HTTP_200_OK
        assert "access" in refresh_resp.data
        assert "refresh" in refresh_resp.data

    def test_logout(self, api_client, create_user):
        user = create_user(email="manager@hotel.com", username="manager@hotel.com")
        
        login_resp = api_client.post(
            reverse("auth-login"),
            {"email": "manager@hotel.com", "password": "Password123!"},
        )
        refresh_token = login_resp.data["refresh"]
        access_token = login_resp.data["access"]

        api_client.credentials(HTTP_AUTHORIZATION=f"Bearer {access_token}")
        logout_resp = api_client.post(
            reverse("auth-logout"), {"refresh": refresh_token}
        )
        
        assert logout_resp.status_code == status.HTTP_200_OK
        
        # Verify token is blacklisted by trying to refresh
        refresh_resp = api_client.post(
            reverse("auth-refresh"), {"refresh": refresh_token}
        )
        assert refresh_resp.status_code == status.HTTP_401_UNAUTHORIZED

    def test_me_endpoint(self, api_client, create_user):
        user = create_user(email="manager@hotel.com", username="manager@hotel.com")
        
        login_resp = api_client.post(
            reverse("auth-login"),
            {"email": "manager@hotel.com", "password": "Password123!"},
        )
        api_client.credentials(HTTP_AUTHORIZATION=f"Bearer {login_resp.data['access']}")
        
        response = api_client.get(reverse("auth-me"))
        assert response.status_code == status.HTTP_200_OK
        assert response.data["email"] == "manager@hotel.com"

    def test_update_me(self, api_client, create_user):
        user = create_user(email="manager@hotel.com", username="manager@hotel.com")
        
        login_resp = api_client.post(
            reverse("auth-login"),
            {"email": "manager@hotel.com", "password": "Password123!"},
        )
        api_client.credentials(HTTP_AUTHORIZATION=f"Bearer {login_resp.data['access']}")
        
        response = api_client.put(
            reverse("auth-me"), 
            {"first_name": "Updated", "last_name": "Name", "phone": "123456"}
        )
        assert response.status_code == status.HTTP_200_OK
        
        user.refresh_from_db()
        assert user.first_name == "Updated"
        assert user.phone == "123456"

    def test_preferred_language_flow(self, api_client, create_user):
        user = create_user(email="manager@hotel.com", username="manager@hotel.com")
        
        login_resp = api_client.post(
            reverse("auth-login"),
            {"email": "manager@hotel.com", "password": "Password123!"},
        )
        api_client.credentials(HTTP_AUTHORIZATION=f"Bearer {login_resp.data['access']}")
        
        # Verify default language is English
        response = api_client.get(reverse("auth-me"))
        assert response.status_code == status.HTTP_200_OK
        assert response.data["preferred_language"] == "en"
        
        # Change preferred language to Nepali
        response = api_client.put(
            reverse("auth-me"),
            {"preferred_language": "ne"}
        )
        assert response.status_code == status.HTTP_200_OK
        assert response.data["preferred_language"] == "ne"
        
        user.refresh_from_db()
        assert user.preferred_language == "ne"
