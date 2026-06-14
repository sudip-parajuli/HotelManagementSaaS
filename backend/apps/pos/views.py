"""
SIA HMS — POS Views
"""

from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from django.db import transaction
from django.utils import timezone

from apps.accounts.permissions import IsRestaurantStaff, IsPropertyManager, IsAnyStaff
from apps.restaurant.models import DiningTable, MenuItem
from apps.bookings.models import Reservation, ReservationStatus
from .models import Order, OrderItem, KOT
from .serializers import OrderSerializer, OrderItemSerializer, KOTSerializer
from channels.layers import get_channel_layer
from asgiref.sync import async_to_sync


class OrderViewSet(viewsets.ModelViewSet):
    queryset = Order.objects.all()
    serializer_class = OrderSerializer
    permission_classes = [IsAuthenticated, IsRestaurantStaff | IsPropertyManager]

    @action(detail=False, methods=["get"], permission_classes=[IsAuthenticated, IsAnyStaff])
    def active(self, request):
        """
        Retrieves all active POS orders that are not yet paid or cancelled.
        """
        orders = Order.objects.exclude(
            status__in=[Order.OrderStatus.PAID, Order.OrderStatus.CANCELLED]
        )
        return Response(OrderSerializer(orders, many=True).data)

    @action(detail=True, methods=["post"])
    def items(self, request, pk=None):
        """
        Adds new menu items to an existing active order and generates a new KOT.
        """
        order = self.get_object()
        if order.status in [Order.OrderStatus.PAID, Order.OrderStatus.CANCELLED]:
            return Response(
                {"error": f"Cannot add items to a {order.status} order."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        items_data = request.data.get("items", [])
        if not items_data:
            return Response(
                {"error": "items list is empty."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        with transaction.atomic():
            new_items = []
            for item in items_data:
                try:
                    menu_item = MenuItem.objects.get(id=item["menu_item_id"])
                except MenuItem.DoesNotExist:
                    return Response(
                        {"error": f"MenuItem with ID {item['menu_item_id']} not found."},
                        status=status.HTTP_404_NOT_FOUND,
                    )
                
                qty = item.get("quantity", 1)
                
                order_item = OrderItem.objects.create(
                    order=order,
                    menu_item=menu_item,
                    quantity=qty,
                    unit_price=menu_item.price,
                    modifiers=item.get("modifiers", {}),
                    notes=item.get("notes", ""),
                )
                new_items.append(order_item)
                
            # Recalculate totals
            from decimal import Decimal
            subtotal = sum(it.unit_price * it.quantity for it in order.items.all())
            order.subtotal = subtotal
            order.tax_amount = subtotal * Decimal("0.13")
            order.total_amount = max((subtotal + order.tax_amount) - order.discount_amount, 0)
            order.save()

            # Generate KOT for new items
            serializer = self.get_serializer(order)
            serializer._generate_kots(order, new_items)

        return Response(OrderSerializer(order).data, status=status.HTTP_201_CREATED)

    @action(detail=True, methods=["put"])
    def update_item(self, request, pk=None):
        """
        Updates the preparation status of a specific order item.
        """
        order = self.get_object()
        item_id = request.data.get("item_id")
        new_status = request.data.get("status")

        if new_status not in OrderItem.ItemStatus.values:
            return Response(
                {"error": f"Invalid item status: {new_status}"},
                status=status.HTTP_400_BAD_REQUEST,
            )

        try:
            item = order.items.get(id=item_id)
        except OrderItem.DoesNotExist:
            return Response(
                {"error": f"OrderItem {item_id} not found in Order {order.id}."},
                status=status.HTTP_404_NOT_FOUND,
            )

        with transaction.atomic():
            item.status = new_status
            item.save()

            # Broadcast status change to KDS
            self._broadcast_item_update(item)

        return Response(OrderItemSerializer(item).data)

    @action(detail=True, methods=["post"])
    def pay(self, request, pk=None):
        """
        Settles payment for a POS order. Supports cash, card and active room charges.
        """
        order = self.get_object()
        payment_method = request.data.get("payment_method", "cash")

        with transaction.atomic():
            if payment_method == "room":
                res_id = request.data.get("reservation_id")
                if not res_id:
                    return Response(
                        {"error": "reservation_id is required for room charge."},
                        status=status.HTTP_400_BAD_REQUEST,
                    )
                try:
                    res = Reservation.objects.select_for_update().get(id=res_id)
                except Reservation.DoesNotExist:
                    return Response(
                        {"error": "Reservation not found."},
                        status=status.HTTP_404_NOT_FOUND,
                    )
                
                if res.status != ReservationStatus.CHECKED_IN:
                    return Response(
                        {"error": "Reservation is not checked-in."},
                        status=status.HTTP_400_BAD_REQUEST,
                    )
                
                order.reservation = res
                order.status = Order.OrderStatus.SERVED  # Served, settled during guest check-out
                order.save()
            else:
                order.status = Order.OrderStatus.PAID
                order.paid_at = timezone.now()
                order.save()

            if order.table:
                # Set table status to cleaning
                order.table.status = DiningTable.TableStatus.CLEANING
                order.table.save()

        return Response(OrderSerializer(order).data)

    @action(detail=True, methods=["post"])
    def void(self, request, pk=None):
        """
        Voids a POS order. Restricted to managers.
        """
        order = self.get_object()
        reason = request.data.get("void_reason", "")
        if not reason.strip():
            return Response(
                {"error": "void_reason is required to void order."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        # Manager restriction
        if request.user.role != "PROPERTY_MANAGER" and not request.user.is_superuser:
            return Response(
                {"error": "Only Property Managers can void active orders."},
                status=status.HTTP_403_FORBIDDEN,
            )

        with transaction.atomic():
            order.status = Order.OrderStatus.CANCELLED
            order.notes = f"{order.notes}\nVOIDED: {reason}".strip()
            order.save()

            if order.table:
                order.table.status = DiningTable.TableStatus.AVAILABLE
                order.table.save()

        return Response(OrderSerializer(order).data)

    def _broadcast_item_update(self, item):
        channel_layer = get_channel_layer()
        if not channel_layer:
            return

        kot = item.kots.first()
        if not kot:
            return

        async_to_sync(channel_layer.group_send)(
            f"kds_{kot.station}",
            {
                "type": "kds.order.update",
                "data": {
                    "event": "item_status_updated",
                    "kot_id": kot.id,
                    "item_id": item.id,
                    "status": item.status,
                }
            }
        )


class KOTViewSet(viewsets.ReadOnlyModelViewSet):
    serializer_class = KOTSerializer
    permission_classes = [IsAuthenticated, IsAnyStaff]

    def get_queryset(self):
        """
        Filter KOTs by prep station query.
        """
        station = self.request.query_params.get("station")
        queryset = KOT.objects.filter(status=KOT.KOTStatus.PENDING)
        if station:
            queryset = queryset.filter(station=station)
        return queryset

    @action(detail=True, methods=["post"], permission_classes=[IsAuthenticated, IsRestaurantStaff | IsPropertyManager])
    def done(self, request, pk=None):
        """
        Marks KOT status as DONE and updates item statuses to served.
        """
        kot = self.get_object()
        with transaction.atomic():
            kot.status = KOT.KOTStatus.DONE
            kot.save()

            # Shift all items to served
            for item in kot.items.all():
                item.status = OrderItem.ItemStatus.SERVED
                item.save()

            # Broadcast completion to station group
            channel_layer = get_channel_layer()
            if channel_layer:
                async_to_sync(channel_layer.group_send)(
                    f"kds_{kot.station}",
                    {
                        "type": "kds.order.update",
                        "data": {
                            "event": "kot_completed",
                            "kot_id": kot.id,
                        }
                    }
                )

        return Response(KOTSerializer(kot).data)
