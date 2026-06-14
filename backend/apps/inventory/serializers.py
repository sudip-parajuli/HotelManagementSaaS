"""
SIA HMS — Inventory Serializers
Defines serializers for Category, InventoryItem, Supplier, PurchaseOrder, POItem, StockMovement, and Recipe.
"""

from rest_framework import serializers
from django.contrib.auth import get_user_model
from apps.restaurant.models import MenuItem
from .models import Category, InventoryItem, Supplier, PurchaseOrder, POItem, StockMovement, Recipe

User = get_user_model()


class CategorySerializer(serializers.ModelSerializer):
    parent_id = serializers.PrimaryKeyRelatedField(
        queryset=Category.objects.all(),
        source="parent",
        required=False,
        allow_null=True,
        write_only=True,
    )
    parent_name = serializers.CharField(source="parent.name", read_only=True)

    class Meta:
        model = Category
        fields = ["id", "name", "parent", "parent_id", "parent_name"]
        read_only_fields = ["id"]


class InventoryItemSerializer(serializers.ModelSerializer):
    category_id = serializers.PrimaryKeyRelatedField(
        queryset=Category.objects.all(),
        source="category",
        write_only=True,
    )
    category_name = serializers.CharField(source="category.name", read_only=True)

    class Meta:
        model = InventoryItem
        fields = [
            "id",
            "category",
            "category_id",
            "category_name",
            "name",
            "sku",
            "unit",
            "current_stock",
            "reorder_level",
            "max_stock",
            "cost_price",
            "last_purchase_price",
            "is_perishable",
            "expiry_tracking",
        ]
        read_only_fields = ["id", "current_stock"]


class SupplierSerializer(serializers.ModelSerializer):
    class Meta:
        model = Supplier
        fields = [
            "id",
            "name",
            "contact_person",
            "phone",
            "email",
            "address",
            "payment_terms",
            "rating",
        ]
        read_only_fields = ["id"]


class POItemSerializer(serializers.ModelSerializer):
    item_id = serializers.PrimaryKeyRelatedField(
        queryset=InventoryItem.objects.all(),
        source="item",
        write_only=True,
    )
    item_name = serializers.CharField(source="item.name", read_only=True)
    item_sku = serializers.CharField(source="item.sku", read_only=True)
    item_unit = serializers.CharField(source="item.unit", read_only=True)

    class Meta:
        model = POItem
        fields = [
            "id",
            "item",
            "item_id",
            "item_name",
            "item_sku",
            "item_unit",
            "quantity",
            "unit_price",
            "received_qty",
        ]
        read_only_fields = ["id", "item", "received_qty"]


class PurchaseOrderSerializer(serializers.ModelSerializer):
    supplier_id = serializers.PrimaryKeyRelatedField(
        queryset=Supplier.objects.all(),
        source="supplier",
        write_only=True,
    )
    supplier_name = serializers.CharField(source="supplier.name", read_only=True)
    created_by_name = serializers.SerializerMethodField(read_only=True)
    items = POItemSerializer(many=True, required=False)

    class Meta:
        model = PurchaseOrder
        fields = [
            "id",
            "supplier",
            "supplier_id",
            "supplier_name",
            "status",
            "expected_date",
            "notes",
            "total_amount",
            "created_by",
            "created_by_name",
            "created_at",
            "items",
        ]
        read_only_fields = ["id", "supplier", "created_by", "created_at", "total_amount"]

    def get_created_by_name(self, obj):
        if obj.created_by:
            return obj.created_by.get_full_name() or obj.created_by.username
        return None

    def create(self, validated_data):
        items_data = validated_data.pop("items", [])
        po = PurchaseOrder.objects.create(**validated_data)
        
        total_amount = 0
        for item_data in items_data:
            qty = item_data.get("quantity")
            price = item_data.get("unit_price")
            total_amount += qty * price
            POItem.objects.create(po=po, **item_data)
            
        po.total_amount = total_amount
        po.save()
        return po

    def update(self, instance, validated_data):
        items_data = validated_data.pop("items", None)
        
        # Update purchase order details
        for attr, value in validated_data.items():
            setattr(instance, attr, value)
        instance.save()

        # If items are provided, replace existing items or update them
        if items_data is not None:
            instance.items.all().delete()
            total_amount = 0
            for item_data in items_data:
                qty = item_data.get("quantity")
                price = item_data.get("unit_price")
                total_amount += qty * price
                POItem.objects.create(po=instance, **item_data)
            instance.total_amount = total_amount
            instance.save()
            
        return instance


class StockMovementSerializer(serializers.ModelSerializer):
    item_id = serializers.PrimaryKeyRelatedField(
        queryset=InventoryItem.objects.all(),
        source="item",
        write_only=True,
    )
    item_name = serializers.CharField(source="item.name", read_only=True)
    item_sku = serializers.CharField(source="item.sku", read_only=True)
    created_by_name = serializers.SerializerMethodField(read_only=True)

    class Meta:
        model = StockMovement
        fields = [
            "id",
            "item",
            "item_id",
            "item_name",
            "item_sku",
            "movement_type",
            "quantity",
            "unit_cost",
            "reference_id",
            "notes",
            "created_by",
            "created_by_name",
            "created_at",
        ]
        read_only_fields = ["id", "created_by", "created_at"]

    def get_created_by_name(self, obj):
        if obj.created_by:
            return obj.created_by.get_full_name() or obj.created_by.username
        return None


class RecipeSerializer(serializers.ModelSerializer):
    menu_item_id = serializers.PrimaryKeyRelatedField(
        queryset=MenuItem.objects.all(),
        source="menu_item",
        write_only=True,
    )
    menu_item_name = serializers.CharField(source="menu_item.name", read_only=True)
    ingredient_id = serializers.PrimaryKeyRelatedField(
        queryset=InventoryItem.objects.all(),
        source="ingredient",
        write_only=True,
    )
    ingredient_name = serializers.CharField(source="ingredient.name", read_only=True)

    class Meta:
        model = Recipe
        fields = [
            "id",
            "menu_item",
            "menu_item_id",
            "menu_item_name",
            "ingredient",
            "ingredient_id",
            "ingredient_name",
            "quantity_per_serving",
            "unit",
        ]
        read_only_fields = ["id"]
