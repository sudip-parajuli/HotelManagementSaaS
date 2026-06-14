"""
SIA HMS — Restaurant Models
Defines DiningArea, DiningTable, MenuCategory, and MenuItem.
"""

import uuid
from django.db import models


class DiningArea(models.Model):
    """
    Dining area divisions of hotel property (Main Dining Room, Pool Bar, Room Service).
    """
    name = models.CharField(max_length=100)
    is_active = models.BooleanField(default=True)

    class Meta:
        verbose_name = "Dining Area"
        verbose_name_plural = "Dining Areas"

    def __str__(self):
        return self.name


class DiningTable(models.Model):
    """
    Dining tables distributed within Dining Areas.
    """
    class TableStatus(models.TextChoices):
        AVAILABLE = "available", "Available"
        OCCUPIED = "occupied", "Occupied"
        RESERVED = "reserved", "Reserved"
        CLEANING = "cleaning", "Cleaning"

    area = models.ForeignKey(
        DiningArea,
        on_delete=models.CASCADE,
        related_name="tables",
    )
    table_number = models.CharField(max_length=20)
    capacity = models.PositiveIntegerField(default=4)
    status = models.CharField(
        max_length=25,
        choices=TableStatus.choices,
        default=TableStatus.AVAILABLE,
    )
    qr_code = models.UUIDField(default=uuid.uuid4, unique=True, editable=False)

    class Meta:
        verbose_name = "Dining Table"
        verbose_name_plural = "Dining Tables"
        ordering = ["table_number"]

    def __str__(self):
        return f"Table {self.table_number} ({self.area.name})"


class MenuCategory(models.Model):
    """
    Categorization divisions for Menu Items (Starters, Main, Drinks).
    """
    name = models.CharField(max_length=100)
    display_order = models.PositiveIntegerField(default=0)
    is_active = models.BooleanField(default=True)
    icon = models.CharField(
        max_length=50,
        blank=True,
        help_text="Lucide icon code (e.g. coffee, pizza)",
    )

    class Meta:
        verbose_name = "Menu Category"
        verbose_name_plural = "Menu Categories"
        ordering = ["display_order", "name"]

    def __str__(self):
        return self.name


class MenuItem(models.Model):
    """
    Individual items available on the restaurant menu.
    """
    category = models.ForeignKey(
        MenuCategory,
        on_delete=models.CASCADE,
        related_name="items",
    )
    name = models.CharField(max_length=150)
    description = models.TextField(blank=True)
    price = models.DecimalField(max_digits=12, decimal_places=2)
    cost_price = models.DecimalField(max_digits=12, decimal_places=2, default=0.00)
    is_available = models.BooleanField(default=True)
    prep_time_minutes = models.PositiveIntegerField(default=15)
    image = models.CharField(max_length=255, blank=True)
    is_vegetarian = models.BooleanField(default=False)
    is_vegan = models.BooleanField(default=False)
    contains_allergens = models.JSONField(default=list, blank=True)

    class Meta:
        verbose_name = "Menu Item"
        verbose_name_plural = "Menu Items"
        ordering = ["name"]

    def __str__(self):
        return f"{self.name} — Rs.{self.price} ({self.category.name})"
