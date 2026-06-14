"""
SIA HMS — Property & Room URLs
"""

from django.urls import path, include
from rest_framework.routers import DefaultRouter

from .views import (
    PropertyViewSet,
    AmenityViewSet,
    RoomTypeViewSet,
    RoomViewSet,
    RoomImageViewSet,
)

router = DefaultRouter()
router.register(r"properties", PropertyViewSet, basename="property")
router.register(r"amenities", AmenityViewSet, basename="amenity")
router.register(r"room-types", RoomTypeViewSet, basename="room-type")
router.register(r"rooms", RoomViewSet, basename="room")
router.register(r"room-images", RoomImageViewSet, basename="room-image")

urlpatterns = [
    path("", include(router.urls)),
]
