"""
SIA HMS — Housekeeping Operations Tests
"""

import pytest
from datetime import date
from django.urls import reverse
from rest_framework import status
from rest_framework.test import APIClient
from django_tenants.utils import schema_context
from rest_framework_simplejwt.tokens import RefreshToken

from apps.accounts.models import UserRole, User
from apps.properties.models import Property, RoomType, Room, RoomStatus
from apps.housekeeping.models import (
    HousekeepingTask,
    HousekeepingStatus,
    HousekeepingPriority,
    HousekeepingTaskType,
    MaintenanceRequest,
)
from apps.tenants.models import Client, Domain

pytestmark = pytest.mark.django_db


@pytest.fixture
def test_tenant(db):
    """Creates a test tenant client and domain."""
    # Clean up stale test data if any
    try:
        if Client.objects.filter(schema_name="test_hk_tenant").exists():
            with schema_context("test_hk_tenant"):
                User.objects.filter(username="housekeeper@hktest.com").delete()
    except Exception:
        pass
    try:
        Domain.objects.filter(domain="hk-test.localhost").delete()
        Client.objects.filter(schema_name="test_hk_tenant").delete()
    except Exception:
        pass
    try:
        User.objects.filter(username="housekeeper@hktest.com").delete()
    except Exception:
        pass

    client = Client.objects.create(
        schema_name="test_hk_tenant",
        name="Housekeeping Test Hotel",
        contact_email="hk_test@hotel.com",
    )
    domain = Domain.objects.create(
        domain="hk-test.localhost",
        tenant=client,
        is_primary=True,
    )
    yield client


@pytest.fixture
def tenant_housekeeper(test_tenant):
    """Creates a housekeeping staff user in the context of the test tenant."""
    with schema_context(test_tenant.schema_name):
        user = User.objects.create(
            username="housekeeper@hktest.com",
            email="housekeeper@hktest.com",
            first_name="Hk",
            last_name="Staff",
            role=UserRole.HOUSEKEEPING,
            is_active=True,
        )
        user.set_password("Password123!")
        user.save()
        return user


@pytest.fixture
def tenant_auth_client(test_tenant, tenant_housekeeper):
    """Returns an authenticated APIClient routed to the tenant schema."""
    client = APIClient(HTTP_HOST="hk-test.localhost")
    refresh = RefreshToken.for_user(tenant_housekeeper)
    client.credentials(HTTP_AUTHORIZATION=f"Bearer {str(refresh.access_token)}")
    return client


@pytest.fixture
def sample_setup(test_tenant):
    """Creates basic Property, RoomType, and Room."""
    with schema_context(test_tenant.schema_name):
        p = Property.objects.create(name="Hk Hills", address="Lakeside", city="Pokhara")
        rt = RoomType.objects.create(property=p, name="Suite", base_price_per_night=8000)
        room1 = Room.objects.create(room_type=rt, room_number="101", floor=1, status=RoomStatus.DIRTY)
        room2 = Room.objects.create(room_type=rt, room_number="102", floor=1, status=RoomStatus.AVAILABLE)
        return p, rt, room1, room2


class TestHousekeepingOperations:
    """Tests housekeeping cleaning tasks, status changes, bulk assigns, and maintenance logs."""

    def test_update_task_status_to_inprogress(self, test_tenant, tenant_auth_client, sample_setup):
        p, rt, room1, room2 = sample_setup
        with schema_context(test_tenant.schema_name):
            task = HousekeepingTask.objects.create(
                room=room1,
                status=HousekeepingStatus.PENDING,
                priority=HousekeepingPriority.HIGH,
                task_type=HousekeepingTaskType.CLEAN,
            )
            
        url = reverse("tasks-status", kwargs={"pk": task.id})
        payload = {"status": "in_progress"}
        
        response = tenant_auth_client.put(url, payload, format="json")
        assert response.status_code == status.HTTP_200_OK
        assert response.data["status"] == "in_progress"
        assert response.data["started_at"] is not None

    def test_complete_task_success(self, test_tenant, tenant_auth_client, sample_setup):
        p, rt, room1, room2 = sample_setup
        with schema_context(test_tenant.schema_name):
            task = HousekeepingTask.objects.create(
                room=room1,
                status=HousekeepingStatus.IN_PROGRESS,
                priority=HousekeepingPriority.HIGH,
            )
            assert room1.status == RoomStatus.DIRTY
            
        url = reverse("tasks-complete", kwargs={"pk": task.id})
        payload = {"notes": "Cleaning done.", "completion_photo": "photos/completion_101.jpg"}
        
        response = tenant_auth_client.post(url, payload, format="json")
        assert response.status_code == status.HTTP_200_OK
        assert response.data["status"] == "done"
        
        with schema_context(test_tenant.schema_name):
            room1.refresh_from_db()
            # Room status becomes AVAILABLE on task completion
            assert room1.status == RoomStatus.AVAILABLE
            
            task.refresh_from_db()
            assert task.completion_photo == "photos/completion_101.jpg"
            assert "Cleaning done." in task.notes

    def test_bulk_assign_tasks(self, test_tenant, tenant_auth_client, tenant_housekeeper, sample_setup):
        p, rt, room1, room2 = sample_setup
        with schema_context(test_tenant.schema_name):
            task1 = HousekeepingTask.objects.create(room=room1, status=HousekeepingStatus.PENDING)
            task2 = HousekeepingTask.objects.create(room=room2, status=HousekeepingStatus.PENDING)
            
        url = reverse("tasks-bulk-assign")
        payload = {
            "task_ids": [task1.id, task2.id],
            "assigned_to_id": tenant_housekeeper.id,
        }
        
        response = tenant_auth_client.post(url, payload, format="json")
        assert response.status_code == status.HTTP_200_OK
        
        with schema_context(test_tenant.schema_name):
            task1.refresh_from_db()
            task2.refresh_from_db()
            assert task1.assigned_to == tenant_housekeeper
            assert task2.assigned_to == tenant_housekeeper

    def test_create_maintenance_request(self, test_tenant, tenant_auth_client, sample_setup):
        p, rt, room1, room2 = sample_setup
        url = reverse("maintenance-list")
        payload = {
            "room_id": room2.id,
            "category": "plumbing",
            "description": "Leaky tap in toilet",
        }
        
        response = tenant_auth_client.post(url, payload, format="json")
        assert response.status_code == status.HTTP_201_CREATED
        assert response.data["status"] == "open"
        
        with schema_context(test_tenant.schema_name):
            room2.refresh_from_db()
            # Room status auto transitions to MAINTENANCE
            assert room2.status == RoomStatus.MAINTENANCE
            
            # An inspection task was generated automatically
            assert HousekeepingTask.objects.filter(
                room=room2,
                task_type=HousekeepingTaskType.MAINTENANCE,
            ).exists()

    def test_resolve_maintenance_request(self, test_tenant, tenant_auth_client, tenant_housekeeper, sample_setup):
        p, rt, room1, room2 = sample_setup
        with schema_context(test_tenant.schema_name):
            m_req = MaintenanceRequest.objects.create(
                room=room2,
                reported_by=tenant_housekeeper,
                category="electrical",
                description="Bulb broken",
                status="open",
            )
            room2.status = RoomStatus.MAINTENANCE
            room2.save()
            
        url = reverse("maintenance-resolve", kwargs={"pk": m_req.id})
        payload = {"resolution_notes": "Replaced bulb."}
        
        response = tenant_auth_client.post(url, payload, format="json")
        assert response.status_code == status.HTTP_200_OK
        assert response.data["status"] == "resolved"
        
        with schema_context(test_tenant.schema_name):
            room2.refresh_from_db()
            # Room status changes back to DIRTY post maintenance resolution
            assert room2.status == RoomStatus.DIRTY

    def test_get_board_statistics(self, test_tenant, tenant_auth_client, sample_setup):
        p, rt, room1, room2 = sample_setup
        with schema_context(test_tenant.schema_name):
            HousekeepingTask.objects.create(room=room1, status=HousekeepingStatus.PENDING)
            
        url = reverse("board-list")
        response = tenant_auth_client.get(url)
        assert response.status_code == status.HTTP_200_OK
        assert len(response.data) == 2 # room1 and room2
        
        # Check active task details inside board response
        room1_data = next(item for item in response.data if item["room_number"] == "101")
        assert room1_data["active_task"] is not None
        assert room1_data["active_task"]["status"] == "pending"
