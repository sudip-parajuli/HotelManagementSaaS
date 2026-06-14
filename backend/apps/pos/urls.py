from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import OrderViewSet, KOTViewSet

router = DefaultRouter()
router.register(r"orders", OrderViewSet, basename="pos-order")
router.register(r"kds", KOTViewSet, basename="pos-kot")

urlpatterns = [
    path("", include(router.urls)),
]
