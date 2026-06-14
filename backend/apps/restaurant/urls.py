from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import DiningAreaViewSet, DiningTableViewSet, MenuCategoryViewSet, MenuItemViewSet

router = DefaultRouter()
router.register(r"areas", DiningAreaViewSet, basename="dining-area")
router.register(r"tables", DiningTableViewSet, basename="dining-table")
router.register(r"categories", MenuCategoryViewSet, basename="menu-category")
router.register(r"items", MenuItemViewSet, basename="menu-item")

urlpatterns = [
    path("", include(router.urls)),
]
