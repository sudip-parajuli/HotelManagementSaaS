"""
SIA HMS — Housekeeping URLs
"""

from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import HousekeepingTaskViewSet, MaintenanceRequestViewSet, HousekeepingBoardViewSet, RoomDiscrepancyViewSet, LostFoundItemViewSet

router = DefaultRouter()
router.register("tasks", HousekeepingTaskViewSet, basename="tasks")
router.register("maintenance", MaintenanceRequestViewSet, basename="maintenance")
router.register("board", HousekeepingBoardViewSet, basename="board")
router.register("discrepancies", RoomDiscrepancyViewSet, basename="discrepancies")
router.register("lost-found", LostFoundItemViewSet, basename="lost-found")

urlpatterns = [
    path("", include(router.urls)),
]
