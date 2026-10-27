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
    pagination_class = None


class DiningTableViewSet(viewsets.ModelViewSet):
    queryset = DiningTable.objects.all()
    serializer_class = DiningTableSerializer
    permission_classes = [IsAuthenticated, IsRestaurantStaff | IsPropertyManager]
    pagination_class = None

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

    @action(detail=False, methods=["post"])
    def merge(self, request):
        """
        Merges orders from multiple tables into one table's order.
        Body: { table_ids: [...], merged_into: table_id }
        The merged tables will have their orders combined into the target table.
        """
        from django.db import transaction
        from apps.pos.models import Order
        table_ids = request.data.get("table_ids", [])
        merged_into_id = request.data.get("merged_into")
        
        if not table_ids or not merged_into_id:
            return Response(
                {"error": "table_ids and merged_into are required."},
                status=status.HTTP_400_BAD_REQUEST,
            )
        
        try:
            merged_into = DiningTable.objects.get(id=merged_into_id)
            tables_to_merge = DiningTable.objects.filter(id__in=table_ids)
        except DiningTable.DoesNotExist:
            return Response({"error": "Table not found."}, status=status.HTTP_404_NOT_FOUND)
        
        with transaction.atomic():
            # Get all active orders from tables to merge
            orders_to_merge = Order.objects.filter(
                table__in=table_ids,
                status__in=["pending", "preparing", "ready", "served"]
            )
            
            if orders_to_merge.exists():
                # Get or create order on merged_into table
                target_order, _ = Order.objects.get_or_create(
                    table=merged_into,
                    status__in=["pending", "preparing", "ready", "served"],
                    defaults={"order_type": Order.OrderType.DINE_IN, "subtotal": 0}
                )
                
                # Reassign all items to target order
                from apps.pos.models import OrderItem
                items_to_reassign = OrderItem.objects.filter(order__in=orders_to_merge)
                for item in items_to_reassign:
                    item.order = target_order
                    item.save()
                
                # Recalculate totals
                target_order.refresh_from_db()
                
                # Close merged orders
                orders_to_merge.update(status=Order.OrderStatus.CANCELLED)
            
            # Update status of merged tables to cleaning
            tables_to_merge.update(status=DiningTable.TableStatus.CLEANING)
        
        return Response({"detail": "Tables merged successfully.", "order": target_order.id})

    @action(detail=True, methods=["post"])
    def split(self, request, pk=None):
        """
        Splits a merged order into separate bills.
        Body: { split_type: "by_item" | "by_amount", splits: [...] }
        """
        from django.db import transaction
        table = self.get_object()
        split_type = request.data.get("split_type", "by_item")
        splits = request.data.get("splits", [])
        
        # Get active order for this table
        order = Order.objects.filter(
            table=table,
            status__in=["pending", "preparing", "ready", "served"]
        ).first()
        
        if not order:
            return Response({"error": "No active order for this table."}, status=status.HTTP_404_NOT_FOUND)
        
        # For now, return info that split is needed
        return Response({
            "detail": "Split functionality requires frontend implementation for split selection.",
            "order_id": order.id,
            "split_type": split_type
        })

    @action(detail=False, methods=["get"])
    def floor_plan(self, request):
        """
        Returns all tables with their coordinates for floor plan visualization.
        """
        tables = DiningTable.objects.select_related("assigned_waiter").all()
        return Response(DiningTableSerializer(tables, many=True).data)


class MenuCategoryViewSet(viewsets.ModelViewSet):
    queryset = MenuCategory.objects.filter(is_active=True)
    serializer_class = MenuCategorySerializer
    permission_classes = [IsAuthenticated, IsAnyStaff]
    pagination_class = None

    def get_permissions(self):
        if self.action in ["create", "update", "partial_update", "destroy"]:
            self.permission_classes = [IsAuthenticated, IsPropertyManager]
        return super().get_permissions()


class MenuItemViewSet(viewsets.ModelViewSet):
    queryset = MenuItem.objects.all()
    serializer_class = MenuItemSerializer
    permission_classes = [IsAuthenticated, IsAnyStaff]
    pagination_class = None

    def get_permissions(self):
        if self.action in ["create", "update", "partial_update", "destroy"]:
            self.permission_classes = [IsAuthenticated, IsPropertyManager]
        return super().get_permissions()
