"""
SIA HMS — Inventory Signals
Deducts recipe ingredients from stock when a POS OrderItem transitions to served.
"""

from django.db.models.signals import post_save
from django.dispatch import receiver
from django.db import transaction
from apps.pos.models import OrderItem
from .models import Recipe, StockMovement


@receiver(post_save, sender=OrderItem)
def deduct_inventory_on_item_served(sender, instance, created, **kwargs):
    """
    Deduct stock for the ingredients in the menu item recipe when the order item status is SERVED.
    """
    if instance.status == OrderItem.ItemStatus.SERVED:
        # Prevent duplicate deductions using reference_id of StockMovement
        already_deducted = StockMovement.objects.filter(
            movement_type=StockMovement.MovementType.RECIPE_OUT,
            reference_id=instance.id,
        ).exists()

        if already_deducted:
            return

        recipes = Recipe.objects.filter(menu_item=instance.menu_item)
        if not recipes.exists():
            return

        with transaction.atomic():
            for recipe in recipes:
                # Calculate quantity to deduct based on recipe serving size and ordered quantity
                deduct_qty = recipe.quantity_per_serving * instance.quantity
                
                ingredient = recipe.ingredient
                ingredient.current_stock -= deduct_qty
                ingredient.save()

                # Record stock movement
                StockMovement.objects.create(
                    item=ingredient,
                    movement_type=StockMovement.MovementType.RECIPE_OUT,
                    quantity=deduct_qty,
                    reference_id=instance.id,
                    notes=f"Auto-deduction for served order item #{instance.id} ({instance.quantity}x {instance.menu_item.name})",
                    created_by=instance.order.created_by,
                )
