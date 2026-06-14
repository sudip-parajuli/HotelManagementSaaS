"""
SIA HMS — Inventory Views
"""

from decimal import Decimal
from django.db import transaction
from django_filters import rest_framework as filters
from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated

from apps.accounts.permissions import IsInventoryManager, IsAnyStaff, IsPropertyManager
from .models import Category, InventoryItem, Supplier, PurchaseOrder, POItem, StockMovement, Recipe
from .serializers import (
    CategorySerializer,
    InventoryItemSerializer,
    SupplierSerializer,
    PurchaseOrderSerializer,
    POItemSerializer,
    StockMovementSerializer,
    RecipeSerializer,
)


class CategoryViewSet(viewsets.ModelViewSet):
    queryset = Category.objects.all()
    serializer_class = CategorySerializer
    permission_classes = [IsAuthenticated, IsInventoryManager]

    def get_permissions(self):
        if self.action in ["list", "retrieve"]:
            self.permission_classes = [IsAuthenticated, IsAnyStaff]
        return super().get_permissions()


class InventoryItemViewSet(viewsets.ModelViewSet):
    queryset = InventoryItem.objects.all()
    serializer_class = InventoryItemSerializer
    permission_classes = [IsAuthenticated, IsInventoryManager]
    filterset_fields = ["category", "is_perishable", "expiry_tracking"]
    search_fields = ["name", "sku"]

    def get_permissions(self):
        if self.action in ["list", "retrieve"]:
            self.permission_classes = [IsAuthenticated, IsAnyStaff]
        return super().get_permissions()

    @action(detail=True, methods=["post"])
    def adjust(self, request, pk=None):
        """
        Manually adjust the stock levels of an inventory item (relative adjustment).
        """
        item = self.get_object()
        quantity = request.data.get("quantity")
        notes = request.data.get("notes", "")
        movement_type = request.data.get("movement_type", StockMovement.MovementType.ADJUSTMENT)

        if quantity is None:
            return Response(
                {"error": "Relative adjustment quantity is required."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        if movement_type not in StockMovement.MovementType.values:
            return Response(
                {"error": f"Invalid movement type: {movement_type}"},
                status=status.HTTP_400_BAD_REQUEST,
            )

        try:
            qty_val = Decimal(str(quantity))
        except Exception:
            return Response(
                {"error": "Invalid quantity format. Must be a decimal."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        with transaction.atomic():
            item.current_stock += qty_val
            item.save()

            StockMovement.objects.create(
                item=item,
                movement_type=movement_type,
                quantity=abs(qty_val),
                notes=notes,
                created_by=request.user,
            )

        return Response(InventoryItemSerializer(item).data)


class SupplierViewSet(viewsets.ModelViewSet):
    queryset = Supplier.objects.all()
    serializer_class = SupplierSerializer
    permission_classes = [IsAuthenticated, IsInventoryManager]
    search_fields = ["name", "contact_person", "email"]

    def get_permissions(self):
        if self.action in ["list", "retrieve"]:
            self.permission_classes = [IsAuthenticated, IsAnyStaff]
        return super().get_permissions()


class PurchaseOrderViewSet(viewsets.ModelViewSet):
    queryset = PurchaseOrder.objects.all().prefetch_related("items__item")
    serializer_class = PurchaseOrderSerializer
    permission_classes = [IsAuthenticated, IsInventoryManager]
    filterset_fields = ["supplier", "status"]
    ordering_fields = ["created_at", "expected_date", "total_amount"]

    def get_permissions(self):
        if self.action in ["list", "retrieve"]:
            self.permission_classes = [IsAuthenticated, IsAnyStaff]
        return super().get_permissions()

    def perform_create(self, serializer):
        serializer.save(created_by=self.request.user)

    @action(detail=True, methods=["post"])
    def receive(self, request, pk=None):
        """
        Record a Goods Receipt Note (GRN) on this Purchase Order, updating stock.
        Expects payload in the format:
        {
          "items": [
             {"item_id": 1, "received_qty": 10.0},
             {"po_item_id": 2, "received_qty": 5.0}
          ]
        }
        """
        po = self.get_object()
        if po.status in [PurchaseOrder.POStatus.FULFILLED, PurchaseOrder.POStatus.CANCELLED]:
            return Response(
                {"error": f"Cannot receive items on a {po.status} purchase order."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        received_items = request.data.get("items", [])
        if not received_items:
            return Response(
                {"error": "No items provided for reception."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        with transaction.atomic():
            any_received = False
            for r_item in received_items:
                po_item_id = r_item.get("po_item_id")
                item_id = r_item.get("item_id")
                qty = r_item.get("received_qty")

                if qty is None:
                    continue

                try:
                    qty_val = Decimal(str(qty))
                except Exception:
                    continue

                if qty_val <= 0:
                    continue

                # Locate POItem
                po_item = None
                if po_item_id:
                    po_item = po.items.filter(id=po_item_id).first()
                elif item_id:
                    po_item = po.items.filter(item_id=item_id).first()

                if not po_item:
                    return Response(
                        {"error": f"PO item (ID: {po_item_id or item_id}) not found in PO #{po.id}."},
                        status=status.HTTP_400_BAD_REQUEST,
                    )

                # Update POItem received quantity
                po_item.received_qty += qty_val
                po_item.save()

                # Update InventoryItem current stock & last purchase price
                inv_item = po_item.item
                inv_item.current_stock += qty_val
                inv_item.last_purchase_price = po_item.unit_price
                inv_item.save()

                # Record StockMovement
                StockMovement.objects.create(
                    item=inv_item,
                    movement_type=StockMovement.MovementType.PURCHASE_IN,
                    quantity=qty_val,
                    unit_cost=po_item.unit_price,
                    reference_id=po.id,
                    notes=f"Received via PO #{po.id}",
                    created_by=request.user,
                )
                any_received = True

            # Re-evaluate PO status
            all_fulfilled = True
            for item in po.items.all():
                if item.received_qty < item.quantity:
                    all_fulfilled = False

            if all_fulfilled:
                po.status = PurchaseOrder.POStatus.FULFILLED
            elif any_received:
                po.status = PurchaseOrder.POStatus.PARTIAL

            po.save()

        return Response(PurchaseOrderSerializer(po).data)


class StockMovementFilter(filters.FilterSet):
    start_date = filters.DateTimeFilter(field_name="created_at", lookup_expr="gte")
    end_date = filters.DateTimeFilter(field_name="created_at", lookup_expr="lte")

    class Meta:
        model = StockMovement
        fields = ["item", "movement_type", "reference_id"]


class StockMovementViewSet(viewsets.ReadOnlyModelViewSet):
    queryset = StockMovement.objects.all().select_related("item", "created_by")
    serializer_class = StockMovementSerializer
    permission_classes = [IsAuthenticated, IsAnyStaff]
    filterset_class = StockMovementFilter
    ordering_fields = ["created_at", "quantity"]


class RecipeViewSet(viewsets.ModelViewSet):
    queryset = Recipe.objects.all().select_related("menu_item", "ingredient")
    serializer_class = RecipeSerializer
    permission_classes = [IsAuthenticated, IsInventoryManager]
    filterset_fields = ["menu_item", "ingredient"]

    def get_permissions(self):
        if self.action in ["list", "retrieve"]:
            self.permission_classes = [IsAuthenticated, IsAnyStaff]
        return super().get_permissions()
