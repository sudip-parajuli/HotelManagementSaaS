"""
SIA HMS — POS Views (B.2 upgraded)
Adds: discount approval, KOT accept action, sales insights endpoint.
"""

from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from rest_framework.views import APIView
from django.db import transaction
from django.db.models import Sum, Count, Avg, F
from django.utils import timezone
from datetime import timedelta
from decimal import Decimal

from apps.accounts.permissions import IsRestaurantStaff, IsPropertyManager, IsAnyStaff
from apps.restaurant.models import DiningTable, MenuItem
from apps.bookings.models import Reservation, ReservationStatus
from .models import Order, OrderItem, KOT, OrderDiscount
from .serializers import (
    OrderSerializer, OrderItemSerializer, KOTSerializer, OrderDiscountSerializer
)
from channels.layers import get_channel_layer
from asgiref.sync import async_to_sync


class OrderViewSet(viewsets.ModelViewSet):
    queryset = Order.objects.all()
    serializer_class = OrderSerializer
    permission_classes = [IsAuthenticated, IsRestaurantStaff | IsPropertyManager]
    pagination_class = None

    @action(detail=False, methods=["get"], permission_classes=[IsAuthenticated, IsAnyStaff])
    def active(self, request):
        """Retrieves all active POS orders that are not yet paid or cancelled."""
        orders = Order.objects.exclude(
            status__in=[Order.OrderStatus.PAID, Order.OrderStatus.CANCELLED]
        ).prefetch_related("items__menu_item__category", "kots")
        return Response(OrderSerializer(orders, many=True).data)

    @action(detail=True, methods=["post"])
    def items(self, request, pk=None):
        """Adds new menu items to an existing active order and generates a new KOT/BOT."""
        order = self.get_object()
        if order.status in [Order.OrderStatus.PAID, Order.OrderStatus.CANCELLED]:
            return Response(
                {"error": f"Cannot add items to a {order.status} order."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        items_data = request.data.get("items", [])
        if not items_data:
            return Response({"error": "items list is empty."}, status=status.HTTP_400_BAD_REQUEST)

        with transaction.atomic():
            new_items = []
            for item in items_data:
                try:
                    menu_item = MenuItem.objects.get(id=item["menu_item_id"])
                except MenuItem.DoesNotExist:
                    return Response(
                        {"error": f"MenuItem {item['menu_item_id']} not found."},
                        status=status.HTTP_404_NOT_FOUND,
                    )
                order_item = OrderItem.objects.create(
                    order=order,
                    menu_item=menu_item,
                    quantity=item.get("quantity", 1),
                    unit_price=menu_item.price,
                    modifiers=item.get("modifiers", {}),
                    notes=item.get("notes", ""),
                )
                new_items.append(order_item)

            # Recalculate totals
            subtotal = sum(it.unit_price * it.quantity for it in order.items.all())
            order.subtotal = subtotal
            order.tax_amount = subtotal * Decimal("0.13")
            order.total_amount = max(
                (subtotal + order.tax_amount) - order.discount_amount, Decimal("0.00")
            )
            order.save()

            # Generate KOT/BOT for the new items
            ser = self.get_serializer(order)
            ser._generate_kots(order, new_items)

        return Response(OrderSerializer(order).data, status=status.HTTP_201_CREATED)

    @action(detail=True, methods=["put"])
    def update_item(self, request, pk=None):
        """Updates the preparation status of a specific order item."""
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
            self._broadcast_item_update(item)

        return Response(OrderItemSerializer(item).data)

    @action(detail=True, methods=["post"], url_path="discount")
    def apply_discount(self, request, pk=None):
        """
        Apply a discount to an order. If > 10%, creates a pending discount request.
        Managers can approve immediately by passing approved=true.
        """
        order = self.get_object()
        discount_type = request.data.get("discount_type", "percentage")
        value = Decimal(str(request.data.get("value", 0)))
        reason = request.data.get("reason", "")
        is_manager = request.user.role == "PROPERTY_MANAGER" or request.user.is_superuser

        with transaction.atomic():
            discount, _ = OrderDiscount.objects.get_or_create(
                order=order,
                defaults={"requested_by": request.user},
            )
            discount.discount_type = discount_type
            discount.value = value
            discount.reason = reason
            discount.requested_by = request.user

            needs_approval = discount_type == "percentage" and value > OrderDiscount.APPROVAL_THRESHOLD_PCT
            if needs_approval and not is_manager:
                discount.approval_status = OrderDiscount.ApprovalStatus.PENDING
                discount.save()
                return Response(
                    {
                        "detail": "Discount request submitted. Awaiting manager approval.",
                        "discount": OrderDiscountSerializer(discount).data,
                    },
                    status=status.HTTP_202_ACCEPTED,
                )

            # Auto-approve (manager or below threshold)
            discount.approval_status = OrderDiscount.ApprovalStatus.APPROVED
            discount.approved_by = request.user
            discount.reviewed_at = timezone.now()
            discount.save()

            # Apply to order totals
            if discount_type == "percentage":
                order.discount_amount = (order.subtotal * value / Decimal("100")).quantize(Decimal("0.01"))
            else:
                order.discount_amount = value
            order.total_amount = max(
                (order.subtotal + order.tax_amount) - order.discount_amount, Decimal("0.00")
            )
            order.save()

        return Response(OrderSerializer(order).data)

    @action(detail=True, methods=["post"], url_path="discount/approve",
            permission_classes=[IsAuthenticated, IsPropertyManager])
    def approve_discount(self, request, pk=None):
        """Manager approves or rejects a pending discount request."""
        order = self.get_object()
        decision = request.data.get("decision")  # "approved" or "rejected"
        if decision not in [OrderDiscount.ApprovalStatus.APPROVED, OrderDiscount.ApprovalStatus.REJECTED]:
            return Response({"error": "decision must be 'approved' or 'rejected'."}, status=400)

        try:
            discount = order.discount_detail
        except OrderDiscount.DoesNotExist:
            return Response({"error": "No pending discount for this order."}, status=404)

        with transaction.atomic():
            discount.approval_status = decision
            discount.approved_by = request.user
            discount.reviewed_at = timezone.now()
            discount.save()

            if decision == OrderDiscount.ApprovalStatus.APPROVED:
                if discount.discount_type == "percentage":
                    order.discount_amount = (order.subtotal * discount.value / Decimal("100")).quantize(Decimal("0.01"))
                else:
                    order.discount_amount = discount.value
                order.total_amount = max(
                    (order.subtotal + order.tax_amount) - order.discount_amount, Decimal("0.00")
                )
                order.save()

        return Response(OrderSerializer(order).data)

    @action(detail=True, methods=["post"])
    def pay(self, request, pk=None):
        """Settles payment for a POS order. Supports cash, card, and room charges."""
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
                    return Response({"error": "Reservation not found."}, status=404)

                if res.status != ReservationStatus.CHECKED_IN:
                    return Response({"error": "Reservation is not checked-in."}, status=400)

                order.reservation = res
                order.status = Order.OrderStatus.SERVED
                order.save()
            else:
                order.status = Order.OrderStatus.PAID
                order.paid_at = timezone.now()
                order.save()

            if order.table:
                order.table.status = DiningTable.TableStatus.CLEANING
                order.table.save()

        return Response(OrderSerializer(order).data)

    @action(detail=True, methods=["post"])
    def void(self, request, pk=None):
        """Voids a POS order. Restricted to managers."""
        order = self.get_object()
        reason = request.data.get("void_reason", "")
        if not reason.strip():
            return Response({"error": "void_reason is required to void order."}, status=400)

        if request.user.role != "PROPERTY_MANAGER" and not request.user.is_superuser:
            return Response({"error": "Only Property Managers can void active orders."}, status=403)

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
    pagination_class = None

    def get_queryset(self):
        """Filter KOTs by prep station and/or ticket_type."""
        station = self.request.query_params.get("station")
        ticket_type = self.request.query_params.get("ticket_type")
        qs = KOT.objects.exclude(status=KOT.KOTStatus.DONE).prefetch_related("items__menu_item")
        if station:
            qs = qs.filter(station=station)
        if ticket_type:
            qs = qs.filter(ticket_type=ticket_type)
        return qs

    @action(detail=True, methods=["post"],
            permission_classes=[IsAuthenticated, IsRestaurantStaff | IsPropertyManager])
    def accept(self, request, pk=None):
        """Chef taps Accept on KDS — records accepted_at timestamp."""
        kot = self.get_object()
        if kot.status != KOT.KOTStatus.PENDING:
            return Response({"error": "Only PENDING tickets can be accepted."}, status=400)

        with transaction.atomic():
            kot.status = KOT.KOTStatus.ACCEPTED
            kot.accepted_at = timezone.now()
            kot.save()

            # Broadcast acceptance to KDS
            channel_layer = get_channel_layer()
            if channel_layer:
                async_to_sync(channel_layer.group_send)(
                    f"kds_{kot.station}",
                    {
                        "type": "kds.order.update",
                        "data": {
                            "event": "kot_accepted",
                            "kot_id": kot.id,
                            "accepted_at": kot.accepted_at.isoformat(),
                        }
                    }
                )

        return Response(KOTSerializer(kot).data)

    @action(detail=True, methods=["post"],
            permission_classes=[IsAuthenticated, IsRestaurantStaff | IsPropertyManager])
    def done(self, request, pk=None):
        """Marks KOT/BOT as DONE, records completed_at, and bumps item statuses to Ready."""
        kot = self.get_object()
        with transaction.atomic():
            kot.status = KOT.KOTStatus.DONE
            kot.completed_at = timezone.now()
            kot.save()

            for item in kot.items.all():
                item.status = OrderItem.ItemStatus.READY
                item.save()

            channel_layer = get_channel_layer()
            if channel_layer:
                async_to_sync(channel_layer.group_send)(
                    f"kds_{kot.station}",
                    {
                        "type": "kds.order.update",
                        "data": {
                            "event": "kot_completed",
                            "kot_id": kot.id,
                            "completed_at": kot.completed_at.isoformat(),
                        }
                    }
                )

        return Response(KOTSerializer(kot).data)

    @action(detail=True, methods=["post"],
            permission_classes=[IsAuthenticated, IsRestaurantStaff | IsPropertyManager])
    def served(self, request, pk=None):
        """Waiter confirms food delivered — records served_at and bumps items to Served."""
        kot = self.get_object()
        with transaction.atomic():
            kot.served_at = timezone.now()
            kot.save()

            for item in kot.items.all():
                item.status = OrderItem.ItemStatus.SERVED
                item.save()

        return Response(KOTSerializer(kot).data)


class POSSalesInsightsView(APIView):
    """
    GET /api/pos/insights/
    Returns last-30-day sales breakdown for the restaurant dashboard.
    Params: ?days=30 (1–90)
    """
    permission_classes = [IsAuthenticated, IsPropertyManager | IsRestaurantStaff]

    def get(self, request):
        try:
            days = max(1, min(90, int(request.query_params.get("days", 30))))
        except (ValueError, TypeError):
            days = 30

        since = timezone.now() - timedelta(days=days)
        paid_orders = Order.objects.filter(
            status=Order.OrderStatus.PAID,
            paid_at__gte=since,
        )

        # Revenue summary
        revenue = paid_orders.aggregate(
            total_revenue=Sum("total_amount"),
            total_orders=Count("id"),
            avg_order_value=Avg("total_amount"),
        )

        # By order type
        by_type = (
            paid_orders.values("order_type")
            .annotate(count=Count("id"), revenue=Sum("total_amount"))
            .order_by("-revenue")
        )

        # Top 10 selling items
        top_items = (
            OrderItem.objects.filter(order__in=paid_orders)
            .values(name=F("menu_item__name"), category=F("menu_item__category__name"))
            .annotate(qty_sold=Sum("quantity"), revenue=Sum(F("unit_price") * F("quantity")))
            .order_by("-qty_sold")[:10]
        )

        # KOT cycle time averages (seconds)
        kots_with_times = KOT.objects.filter(
            order__in=paid_orders,
            accepted_at__isnull=False,
            completed_at__isnull=False,
        )
        avg_accept_time = None
        avg_cook_time = None
        if kots_with_times.exists():
            times = [(k.accepted_at - k.created_at, k.completed_at - k.accepted_at) for k in kots_with_times]
            avg_accept_time = int(sum(t[0].total_seconds() for t in times) / len(times))
            avg_cook_time = int(sum(t[1].total_seconds() for t in times) / len(times))

        # Discount stats
        discount_stats = paid_orders.aggregate(
            total_discounts=Sum("discount_amount"),
        )

        return Response({
            "period_days": days,
            "since": since.date().isoformat(),
            "revenue": {
                "total": str(revenue["total_revenue"] or 0),
                "orders": revenue["total_orders"] or 0,
                "avg_order_value": str(round(revenue["avg_order_value"] or 0, 2)),
            },
            "by_order_type": list(by_type),
            "top_items": list(top_items),
            "kds_performance": {
                "avg_accept_time_seconds": avg_accept_time,
                "avg_cook_time_seconds": avg_cook_time,
            },
            "discounts": {
                "total_discounted": str(discount_stats["total_discounts"] or 0),
            },
        })
