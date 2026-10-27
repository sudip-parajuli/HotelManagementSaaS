"""
SIA HMS — Inventory URLs
"""

from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import (
    CategoryViewSet,
    InventoryItemViewSet,
    SupplierViewSet,
    PurchaseOrderViewSet,
    StockMovementViewSet,
    RecipeViewSet,
    RoomAmenityConsumptionViewSet,
)

router = DefaultRouter()
router.register(r"categories", CategoryViewSet, basename="category")
router.register(r"items", InventoryItemViewSet, basename="inventoryitem")
router.register(r"suppliers", SupplierViewSet, basename="supplier")
router.register(r"purchase-orders", PurchaseOrderViewSet, basename="purchaseorder")
router.register(r"movements", StockMovementViewSet, basename="stockmovement")
router.register(r"recipes", RecipeViewSet, basename="recipe")
router.register(r"room-consumptions", RoomAmenityConsumptionViewSet, basename="roomconsumption")

urlpatterns = [
    path("", include(router.urls)),
]
