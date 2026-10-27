"""
SIA HMS — POS (Point of Sale) Models
Defines Order, OrderItem, KOT, and OrderDiscount.
"""

from django.db import models
from django.conf import settings
from decimal import Decimal
from apps.restaurant.models import DiningTable, MenuItem
from apps.bookings.models import Reservation


class Order(models.Model):
    """
    Represents an active POS order (dine-in, bar tab, room service, takeaway).
    Pre-orders are supported via scheduled_at (Celery task activates them).
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
    # Pre-order: staff can schedule orders for a future time.
    scheduled_at = models.DateTimeField(
        null=True,
        blank=True,
        help_text="Pre-order delivery time; null = fire immediately",
    )
    is_pre_order = models.BooleanField(default=False)

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


class OrderDiscount(models.Model):
    """
    Discount applied to an order with manager approval threshold enforcement.
    Discounts above APPROVAL_THRESHOLD_PCT (10%) require manager sign-off.
    """
    class DiscountType(models.TextChoices):
        PERCENTAGE = "percentage", "Percentage"
        FIXED = "fixed", "Fixed Amount"

    class ApprovalStatus(models.TextChoices):
        PENDING = "pending", "Pending Approval"
        APPROVED = "approved", "Approved"
        REJECTED = "rejected", "Rejected"

    order = models.OneToOneField(
        Order,
        on_delete=models.CASCADE,
        related_name="discount_detail",
    )
    discount_type = models.CharField(
        max_length=20,
        choices=DiscountType.choices,
        default=DiscountType.PERCENTAGE,
    )
    value = models.DecimalField(max_digits=8, decimal_places=2, help_text="% or flat NPR amount")
    reason = models.TextField(blank=True)
    approval_status = models.CharField(
        max_length=20,
        choices=ApprovalStatus.choices,
        default=ApprovalStatus.PENDING,
    )
    requested_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        related_name="discount_requests",
    )
    approved_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="discount_approvals",
    )
    created_at = models.DateTimeField(auto_now_add=True)
    reviewed_at = models.DateTimeField(null=True, blank=True)

    APPROVAL_THRESHOLD_PCT = Decimal("10.00")

    def requires_approval(self) -> bool:
        if self.discount_type == self.DiscountType.PERCENTAGE:
            return self.value > self.APPROVAL_THRESHOLD_PCT
        return False

    class Meta:
        verbose_name = "Order Discount"
        verbose_name_plural = "Order Discounts"

    def __str__(self):
        return f"Discount for Order #{self.order_id} — {self.value} ({self.discount_type})"


class KOT(models.Model):
    """
    Kitchen/Bar Order Ticket routed to prep stations.
    ticket_type distinguishes KOT (kitchen food) from BOT (bar drinks).
    Timing fields allow KDS cycle-time reporting.
    """
    class TicketType(models.TextChoices):
        KOT = "kot", "Kitchen Order Ticket"
        BOT = "bot", "Bar Order Ticket"

    class StationChoices(models.TextChoices):
        HOT_KITCHEN = "hot_kitchen", "Hot Kitchen"
        COLD_PREP = "cold_prep", "Cold Prep"
        BAR = "bar", "Bar"
        PASTRY = "pastry", "Pastry"

    class KOTStatus(models.TextChoices):
        PENDING = "pending", "Pending"
        ACCEPTED = "accepted", "Accepted"
        DONE = "done", "Done"

    order = models.ForeignKey(
        Order,
        on_delete=models.CASCADE,
        related_name="kots",
    )
    ticket_type = models.CharField(
        max_length=10,
        choices=TicketType.choices,
        default=TicketType.KOT,
        help_text="KOT = kitchen food, BOT = bar drinks",
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
    # KDS cycle-time tracking
    created_at = models.DateTimeField(auto_now_add=True)
    accepted_at = models.DateTimeField(null=True, blank=True, help_text="When chef tapped Accept on KDS")
    completed_at = models.DateTimeField(null=True, blank=True, help_text="When chef marked items Done")
    served_at = models.DateTimeField(null=True, blank=True, help_text="When waiter confirmed delivery to table")

    class Meta:
        verbose_name = "Order Ticket (KOT/BOT)"
        verbose_name_plural = "Order Tickets (KOT/BOT)"
        ordering = ["created_at"]

    def __str__(self):
        return f"{self.ticket_type.upper()} #{self.id} for Order #{self.order.id} ({self.station})"
