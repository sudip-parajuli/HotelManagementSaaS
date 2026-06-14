"""
SIA HMS — Inventory Models
Defines Category, InventoryItem, Supplier, PurchaseOrder, POItem, StockMovement, and Recipe.
"""

from django.db import models
from django.conf import settings
from apps.restaurant.models import MenuItem


class Category(models.Model):
    name = models.CharField(max_length=100)
    parent = models.ForeignKey(
        "self",
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="subcategories",
    )

    class Meta:
        verbose_name = "Category"
        verbose_name_plural = "Categories"

    def __str__(self):
        return self.name


class InventoryItem(models.Model):
    class UnitChoices(models.TextChoices):
        KG = "kg", "Kilogram"
        LITRE = "litre", "Litre"
        PIECE = "piece", "Piece"
        BOX = "box", "Box"
        DOZEN = "dozen", "Dozen"

    category = models.ForeignKey(
        Category,
        on_delete=models.PROTECT,
        related_name="items",
    )
    name = models.CharField(max_length=150)
    sku = models.CharField(max_length=50, unique=True)
    unit = models.CharField(
        max_length=20,
        choices=UnitChoices.choices,
        default=UnitChoices.PIECE,
    )
    current_stock = models.DecimalField(max_digits=12, decimal_places=4, default=0.0000)
    reorder_level = models.DecimalField(max_digits=12, decimal_places=4, default=0.0000)
    max_stock = models.DecimalField(max_digits=12, decimal_places=4, default=0.0000)
    cost_price = models.DecimalField(max_digits=12, decimal_places=2, default=0.00)
    last_purchase_price = models.DecimalField(max_digits=12, decimal_places=2, default=0.00)
    is_perishable = models.BooleanField(default=False)
    expiry_tracking = models.BooleanField(default=False)

    class Meta:
        verbose_name = "Inventory Item"
        verbose_name_plural = "Inventory Items"
        ordering = ["name"]

    def __str__(self):
        return f"{self.name} ({self.sku}) — {self.current_stock} {self.unit}"


class Supplier(models.Model):
    name = models.CharField(max_length=150)
    contact_person = models.CharField(max_length=100, blank=True)
    phone = models.CharField(max_length=20)
    email = models.EmailField(blank=True)
    address = models.TextField(blank=True)
    payment_terms = models.CharField(
        max_length=100,
        blank=True,
        help_text="e.g. Net 30, Cash on Delivery",
    )
    rating = models.PositiveIntegerField(default=5)

    class Meta:
        verbose_name = "Supplier"
        verbose_name_plural = "Suppliers"

    def __str__(self):
        return self.name


class PurchaseOrder(models.Model):
    class POStatus(models.TextChoices):
        DRAFT = "draft", "Draft"
        SENT = "sent", "Sent"
        PARTIAL = "partial", "Partially Received"
        FULFILLED = "fulfilled", "Fulfilled"
        CANCELLED = "cancelled", "Cancelled"

    supplier = models.ForeignKey(
        Supplier,
        on_delete=models.PROTECT,
        related_name="purchase_orders",
    )
    status = models.CharField(
        max_length=30,
        choices=POStatus.choices,
        default=POStatus.DRAFT,
    )
    expected_date = models.DateField(null=True, blank=True)
    notes = models.TextField(blank=True)
    total_amount = models.DecimalField(max_digits=12, decimal_places=2, default=0.00)
    
    created_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="created_purchase_orders",
    )
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        verbose_name = "Purchase Order"
        verbose_name_plural = "Purchase Orders"
        ordering = ["-created_at"]

    def __str__(self):
        return f"PO #{self.id} — {self.supplier.name} ({self.status})"


class POItem(models.Model):
    po = models.ForeignKey(
        PurchaseOrder,
        on_delete=models.CASCADE,
        related_name="items",
    )
    item = models.ForeignKey(
        InventoryItem,
        on_delete=models.PROTECT,
        related_name="po_items",
    )
    quantity = models.DecimalField(max_digits=12, decimal_places=4)
    unit_price = models.DecimalField(max_digits=12, decimal_places=2)
    received_qty = models.DecimalField(max_digits=12, decimal_places=4, default=0.0000)

    class Meta:
        verbose_name = "Purchase Order Item"
        verbose_name_plural = "Purchase Order Items"

    def __str__(self):
        return f"{self.quantity}x {self.item.name} in PO #{self.po.id}"


class StockMovement(models.Model):
    class MovementType(models.TextChoices):
        PURCHASE_IN = "purchase_in", "Purchase In"
        MANUAL_IN = "manual_in", "Manual Stock-in"
        RECIPE_OUT = "recipe_out", "Recipe Stock-out"
        MANUAL_OUT = "manual_out", "Manual Stock-out"
        WASTE = "waste", "Waste / Spoiled"
        ADJUSTMENT = "adjustment", "Audit Adjustment"

    item = models.ForeignKey(
        InventoryItem,
        on_delete=models.CASCADE,
        related_name="movements",
    )
    movement_type = models.CharField(
        max_length=30,
        choices=MovementType.choices,
    )
    quantity = models.DecimalField(
        max_digits=12,
        decimal_places=4,
        help_text="Always positive. Addition vs subtraction depends on movement type.",
    )
    unit_cost = models.DecimalField(max_digits=12, decimal_places=2, default=0.00)
    reference_id = models.IntegerField(
        null=True,
        blank=True,
        help_text="ID of linked Order, PurchaseOrder, etc.",
    )
    notes = models.TextField(blank=True)
    
    created_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="created_stock_movements",
    )
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        verbose_name = "Stock Movement"
        verbose_name_plural = "Stock Movements"
        ordering = ["-created_at"]

    def __str__(self):
        return f"{self.movement_type} of {self.quantity} {self.item.name}"


class Recipe(models.Model):
    menu_item = models.ForeignKey(
        MenuItem,
        on_delete=models.CASCADE,
        related_name="recipes",
    )
    ingredient = models.ForeignKey(
        InventoryItem,
        on_delete=models.PROTECT,
        related_name="recipes",
    )
    quantity_per_serving = models.DecimalField(max_digits=12, decimal_places=4)
    unit = models.CharField(
        max_length=20,
        help_text="e.g. kg, litre, piece",
    )

    class Meta:
        verbose_name = "Recipe"
        verbose_name_plural = "Recipes"
        unique_together = ("menu_item", "ingredient")

    def __str__(self):
        return f"{self.quantity_per_serving} {self.unit} of {self.ingredient.name} for {self.menu_item.name}"
