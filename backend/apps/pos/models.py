"""
SIA HMS — POS (Point of Sale) Models
Defines Order, OrderItem, and KOT.
"""

from django.db import models
from django.conf import settings
from apps.restaurant.models import DiningTable, MenuItem
from apps.bookings.models import Reservation


class Order(models.Model):
    """
    Represents an active POS order (dine-in, bar tab, room service, takeaway).
    """
    class OrderType(models.TextChoices):
        DINE_IN = "dine_in", "Dine In"
        TAKEAWAY = "takeaway", "Takeaway"
        ROOM_SERVICE = "room_service", "Room Service"
        BAR = "bar", "Bar tab"

    class OrderStatus(models.TextChoices):
        PENDING = "pending", "Pending"
        PREPARING = "preparing", "Preparing"
        READY = "ready", "Ready"
        SERVED = "served", "Served"
        PAID = "paid", "Paid"
        CANCELLED = "cancelled", "Cancelled"

    table = models.ForeignKey(
        DiningTable,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="orders",
    )
    reservation = models.ForeignKey(
        Reservation,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="pos_orders",
        help_text="Linked active booking for room charging",
    )
    order_type = models.CharField(
        max_length=30,
        choices=OrderType.choices,
        default=OrderType.DINE_IN,
    )
    status = models.CharField(
        max_length=30,
        choices=OrderStatus.choices,
        default=OrderStatus.PENDING,
    )
    
    notes = models.TextField(blank=True)
    subtotal = models.DecimalField(max_digits=12, decimal_places=2, default=0.00)
    tax_amount = models.DecimalField(max_digits=12, decimal_places=2, default=0.00)
    discount_amount = models.DecimalField(max_digits=12, decimal_places=2, default=0.00)
    total_amount = models.DecimalField(max_digits=12, decimal_places=2, default=0.00)

    created_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="pos_created_orders",
    )
    created_at = models.DateTimeField(auto_now_add=True)
    served_at = models.DateTimeField(null=True, blank=True)
    paid_at = models.DateTimeField(null=True, blank=True)

    class Meta:
        verbose_name = "Order"
        verbose_name_plural = "Orders"
        ordering = ["-created_at"]

    def __str__(self):
        return f"Order #{self.id} ({self.order_type} — {self.status})"


class OrderItem(models.Model):
    """
    Individual items linked to a POS order.
    """
    class ItemStatus(models.TextChoices):
        PENDING = "pending", "Pending"
        PREPARING = "preparing", "Preparing"
        READY = "ready", "Ready"
        SERVED = "served", "Served"

    order = models.ForeignKey(
        Order,
        on_delete=models.CASCADE,
        related_name="items",
    )
    menu_item = models.ForeignKey(
        MenuItem,
        on_delete=models.PROTECT,
        related_name="pos_items",
    )
    quantity = models.PositiveIntegerField(default=1)
    unit_price = models.DecimalField(max_digits=12, decimal_places=2)
    modifiers = models.JSONField(
        default=dict,
        blank=True,
        help_text="Custom ingredient modifiers or notes",
    )
    notes = models.TextField(blank=True)
    status = models.CharField(
        max_length=25,
        choices=ItemStatus.choices,
        default=ItemStatus.PENDING,
    )

    class Meta:
        verbose_name = "Order Item"
        verbose_name_plural = "Order Items"

    def __str__(self):
        return f"{self.quantity}x {self.menu_item.name} for Order #{self.order.id}"


class KOT(models.Model):
    """
    Kitchen Order Ticket routed to prep stations.
    """
    class StationChoices(models.TextChoices):
        HOT_KITCHEN = "hot_kitchen", "Hot Kitchen"
        COLD_PREP = "cold_prep", "Cold Prep"
        BAR = "bar", "Bar"
        PASTRY = "pastry", "Pastry"

    class KOTStatus(models.TextChoices):
        PENDING = "pending", "Pending"
        DONE = "done", "Done"

    order = models.ForeignKey(
        Order,
        on_delete=models.CASCADE,
        related_name="kots",
    )
    station = models.CharField(
        max_length=30,
        choices=StationChoices.choices,
        default=StationChoices.HOT_KITCHEN,
    )
    items = models.ManyToManyField(
        OrderItem,
        related_name="kots",
    )
    status = models.CharField(
        max_length=20,
        choices=KOTStatus.choices,
        default=KOTStatus.PENDING,
    )
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        verbose_name = "Kitchen Order Ticket"
        verbose_name_plural = "Kitchen Order Tickets"
        ordering = ["created_at"]

    def __str__(self):
        return f"KOT #{self.id} for Order #{self.order.id} ({self.station})"
