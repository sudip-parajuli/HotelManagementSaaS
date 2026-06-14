"""
SIA HMS — POS Serializers
"""

from rest_framework import serializers
from apps.restaurant.models import MenuItem, DiningTable
from apps.restaurant.serializers import MenuItemSerializer
from apps.bookings.models import Reservation
from .models import Order, OrderItem, KOT
from channels.layers import get_channel_layer
from asgiref.sync import async_to_sync


class OrderItemSerializer(serializers.ModelSerializer):
    menu_item_id = serializers.PrimaryKeyRelatedField(
        queryset=MenuItem.objects.all(),
        write_only=True,
        source="menu_item",
    )
    menu_item = MenuItemSerializer(read_only=True)
    status_display = serializers.CharField(source="get_status_display", read_only=True)

    class Meta:
        model = OrderItem
        fields = [
            "id",
            "menu_item",
            "menu_item_id",
            "quantity",
            "unit_price",
            "modifiers",
            "notes",
            "status",
            "status_display",
        ]
        read_only_fields = ["id", "unit_price", "status"]


class OrderSerializer(serializers.ModelSerializer):
    items = OrderItemSerializer(many=True)
    table_id = serializers.PrimaryKeyRelatedField(
        queryset=DiningTable.objects.all(),
        write_only=True,
        source="table",
        required=False,
        allow_null=True,
    )
    table_number = serializers.CharField(source="table.table_number", read_only=True)
    reservation_id = serializers.PrimaryKeyRelatedField(
        queryset=Reservation.objects.all(),
        write_only=True,
        source="reservation",
        required=False,
        allow_null=True,
    )
    guest_name = serializers.CharField(source="reservation.guest.full_name", read_only=True)

    class Meta:
        model = Order
        fields = [
            "id",
            "table",
            "table_id",
            "table_number",
            "reservation",
            "reservation_id",
            "guest_name",
            "order_type",
            "status",
            "notes",
            "subtotal",
            "tax_amount",
            "discount_amount",
            "total_amount",
            "items",
            "created_by",
            "created_at",
            "served_at",
            "paid_at",
        ]
        read_only_fields = [
            "id",
            "subtotal",
            "tax_amount",
            "total_amount",
            "created_by",
            "created_at",
            "served_at",
            "paid_at",
        ]

    def create(self, validated_data):
        from decimal import Decimal
        items_data = validated_data.pop("items", [])
        discount_amount = Decimal(str(validated_data.get("discount_amount") or 0.00))
        
        # Settle creator
        request = self.context.get("request")
        if request and request.user and request.user.is_authenticated:
            validated_data["created_by"] = request.user

        # Create Order
        order = Order.objects.create(**validated_data)
        
        subtotal = Decimal("0.00")
        order_items = []
        
        for item_data in items_data:
            menu_item = item_data["menu_item"]
            qty = item_data["quantity"]
            price = menu_item.price
            
            subtotal += price * qty
            
            order_item = OrderItem.objects.create(
                order=order,
                menu_item=menu_item,
                quantity=qty,
                unit_price=price,
                modifiers=item_data.get("modifiers", {}),
                notes=item_data.get("notes", ""),
            )
            order_items.append(order_item)

        # Set totals
        order.subtotal = subtotal
        order.tax_amount = subtotal * Decimal("0.13") # 13% VAT
        order.total_amount = max((subtotal + order.tax_amount) - discount_amount, Decimal("0.00"))
        order.save()

        # Update table status to occupied if dine-in
        if order.table and order.order_type == Order.OrderType.DINE_IN:
            order.table.status = DiningTable.TableStatus.OCCUPIED
            order.table.save()

        # Generate KOT tickets grouped by prep station
        self._generate_kots(order, order_items)

        return order

    def _generate_kots(self, order, items):
        station_groups = {}
        for item in items:
            station = self._get_station_for_item(item.menu_item)
            if station not in station_groups:
                station_groups[station] = []
            station_groups[station].append(item)

        for station, station_items in station_groups.items():
            kot = KOT.objects.create(order=order, station=station)
            kot.items.set(station_items)
            
            # Broadcast to KDS station group
            self._broadcast_kds_kot(station, kot)

    def _get_station_for_item(self, menu_item):
        cat_name = menu_item.category.name.lower()
        if any(k in cat_name for k in ["drink", "beverage", "soda", "wine", "beer", "bar"]):
            return KOT.StationChoices.BAR
        if any(k in cat_name for k in ["dessert", "pastry", "cake", "sweet"]):
            return KOT.StationChoices.PASTRY
        if any(k in cat_name for k in ["salad", "cold", "starter"]):
            return KOT.StationChoices.COLD_PREP
        return KOT.StationChoices.HOT_KITCHEN

    def _broadcast_kds_kot(self, station, kot):
        channel_layer = get_channel_layer()
        if not channel_layer:
            return
        
        kot_data = {
            "kot_id": kot.id,
            "order_id": kot.order.id,
            "table_number": kot.order.table.table_number if kot.order.table else "N/A",
            "order_type": kot.order.get_order_type_display(),
            "station": kot.station,
            "created_at": kot.created_at.isoformat(),
            "status": kot.status,
            "items": [
                {
                    "item_id": it.id,
                    "name": it.menu_item.name,
                    "quantity": it.quantity,
                    "notes": it.notes,
                    "modifiers": it.modifiers,
                    "status": it.status,
                }
                for it in kot.items.all()
            ],
        }
        
        async_to_sync(channel_layer.group_send)(
            f"kds_{station}",
            {
                "type": "kds.order.update",
                "data": {
                    "event": "kot_created",
                    "kot": kot_data,
                }
            }
        )


class KOTSerializer(serializers.ModelSerializer):
    order_id = serializers.IntegerField(source="order.id", read_only=True)
    table_number = serializers.CharField(source="order.table.table_number", read_only=True)
    order_type = serializers.CharField(source="order.get_order_type_display", read_only=True)
    items = OrderItemSerializer(many=True, read_only=True)
    station_display = serializers.CharField(source="get_station_display", read_only=True)

    class Meta:
        model = KOT
        fields = [
            "id",
            "order_id",
            "table_number",
            "order_type",
            "station",
            "station_display",
            "status",
            "created_at",
            "items",
        ]
