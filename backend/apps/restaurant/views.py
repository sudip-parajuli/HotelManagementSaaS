"""
SIA HMS — Restaurant Views
"""

from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated

from apps.accounts.permissions import IsRestaurantStaff, IsPropertyManager, IsAnyStaff
from .models import DiningArea, DiningTable, MenuCategory, MenuItem
from .serializers import (
    DiningAreaSerializer,
    DiningTableSerializer,
    MenuCategorySerializer,
    MenuItemSerializer,
)


class DiningAreaViewSet(viewsets.ModelViewSet):
    queryset = DiningArea.objects.filter(is_active=True)
    serializer_class = DiningAreaSerializer
    permission_classes = [IsAuthenticated, IsRestaurantStaff | IsPropertyManager]


class DiningTableViewSet(viewsets.ModelViewSet):
    queryset = DiningTable.objects.all()
    serializer_class = DiningTableSerializer
    permission_classes = [IsAuthenticated, IsRestaurantStaff | IsPropertyManager]

    @action(detail=True, methods=["put"])
    def status(self, request, pk=None):
        """
        Updates the table operational status (available, occupied, cleaning, etc.)
        """
        table = self.get_object()
        new_status = request.data.get("status")
        if new_status not in DiningTable.TableStatus.values:
            return Response(
                {"error": f"Invalid table status: {new_status}"},
                status=status.HTTP_400_BAD_REQUEST,
            )
        
        table.status = new_status
        table.save()
        return Response(DiningTableSerializer(table).data)


class MenuCategoryViewSet(viewsets.ModelViewSet):
    queryset = MenuCategory.objects.filter(is_active=True)
    serializer_class = MenuCategorySerializer
    permission_classes = [IsAuthenticated, IsAnyStaff]

    def get_permissions(self):
        if self.action in ["create", "update", "partial_update", "destroy"]:
            self.permission_classes = [IsAuthenticated, IsPropertyManager]
        return super().get_permissions()


class MenuItemViewSet(viewsets.ModelViewSet):
    queryset = MenuItem.objects.all()
    serializer_class = MenuItemSerializer
    permission_classes = [IsAuthenticated, IsAnyStaff]

    def get_permissions(self):
        if self.action in ["create", "update", "partial_update", "destroy"]:
            self.permission_classes = [IsAuthenticated, IsPropertyManager]
        return super().get_permissions()
