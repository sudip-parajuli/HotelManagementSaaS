"""
SIA HMS — Restaurant Serializers
"""

from rest_framework import serializers
from .models import DiningArea, DiningTable, MenuCategory, MenuItem


class DiningAreaSerializer(serializers.ModelSerializer):
    class Meta:
        model = DiningArea
        fields = "__all__"


class DiningTableSerializer(serializers.ModelSerializer):
    area_name = serializers.CharField(source="area.name", read_only=True)

    class Meta:
        model = DiningTable
        fields = ["id", "area", "area_name", "table_number", "capacity", "status", "qr_code"]
        read_only_fields = ["id", "qr_code"]


class MenuItemSerializer(serializers.ModelSerializer):
    category_name = serializers.CharField(source="category.name", read_only=True)

    class Meta:
        model = MenuItem
        fields = "__all__"


class MenuCategorySerializer(serializers.ModelSerializer):
    items = MenuItemSerializer(many=True, read_only=True)

    class Meta:
        model = MenuCategory
        fields = ["id", "name", "display_order", "is_active", "icon", "items"]
