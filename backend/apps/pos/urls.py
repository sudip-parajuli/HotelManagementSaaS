from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import OrderViewSet, KOTViewSet, POSSalesInsightsView

router = DefaultRouter()
router.register(r"orders", OrderViewSet, basename="pos-order")
router.register(r"kds", KOTViewSet, basename="pos-kot")

urlpatterns = [
    path("", include(router.urls)),
    path("insights/", POSSalesInsightsView.as_view(), name="pos-insights"),
]
