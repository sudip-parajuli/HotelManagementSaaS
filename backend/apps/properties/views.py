"""
SIA HMS — Property & Room Views
"""

from rest_framework import viewsets, permissions
from django_filters.rest_framework import DjangoFilterBackend
from rest_framework.filters import SearchFilter, OrderingFilter

from apps.accounts.permissions import IsAnyStaff, IsPropertyManager, IsFrontDesk
from .models import Property, Amenity, RoomType, Room, RoomImage
from .serializers import (
    PropertySerializer,
    AmenitySerializer,
    RoomTypeSerializer,
    RoomSerializer,
    RoomImageSerializer,
)


class PropertyViewSet(viewsets.ModelViewSet):
    """
    ViewSet for Property CRUD.
    SuperAdmin & PropertyManager can write; all staff can read.
    """

    queryset = Property.objects.all()
    serializer_serializer = PropertySerializer
    serializer_class = PropertySerializer

    def get_permissions(self):
        if self.request.method in permissions.SAFE_METHODS:
            return [IsAnyStaff()]
        return [IsPropertyManager()]


class AmenityViewSet(viewsets.ModelViewSet):
    """
    ViewSet for Amenity CRUD.
    SuperAdmin & PropertyManager can write; all staff can read.
    """

    queryset = Amenity.objects.all()
    serializer_class = AmenitySerializer
    filter_backends = [DjangoFilterBackend, SearchFilter]
    filterset_fields = ["category"]
    search_fields = ["name"]

    def get_permissions(self):
        if self.request.method in permissions.SAFE_METHODS:
            return [IsAnyStaff()]
        return [IsPropertyManager()]


class RoomTypeViewSet(viewsets.ModelViewSet):
    """
    ViewSet for RoomType CRUD.
    SuperAdmin & PropertyManager can write; all staff can read.
    """

    queryset = RoomType.objects.all()
    serializer_class = RoomTypeSerializer
    filter_backends = [DjangoFilterBackend, SearchFilter, OrderingFilter]
    filterset_fields = ["property", "is_active", "max_occupancy"]
    search_fields = ["name", "description"]
    ordering_fields = ["display_order", "base_price_per_night", "name"]

    def get_permissions(self):
        if self.request.method in permissions.SAFE_METHODS:
            return [IsAnyStaff()]
        return [IsPropertyManager()]


class RoomViewSet(viewsets.ModelViewSet):
    """
    ViewSet for Room CRUD.
    SuperAdmin, PropertyManager, and FrontDesk can write; all staff can read.
    """

    queryset = Room.objects.all()
    serializer_class = RoomSerializer
    filter_backends = [DjangoFilterBackend, SearchFilter, OrderingFilter]
    filterset_fields = ["room_type", "status", "floor", "is_active"]
    search_fields = ["room_number", "notes"]
    ordering_fields = ["room_number", "floor", "status", "last_cleaned_at"]

    def get_permissions(self):
        if self.request.method in permissions.SAFE_METHODS:
            return [IsAnyStaff()]
        return [IsFrontDesk()]


class RoomImageViewSet(viewsets.ModelViewSet):
    """
    ViewSet for RoomImage CRUD.
    SuperAdmin & PropertyManager can write; all staff can read.
    """

    queryset = RoomImage.objects.all()
    serializer_class = RoomImageSerializer
    filter_backends = [DjangoFilterBackend]
    filterset_fields = ["room_type", "is_primary"]

    def get_permissions(self):
        if self.request.method in permissions.SAFE_METHODS:
            return [IsAnyStaff()]
        return [IsPropertyManager()]
