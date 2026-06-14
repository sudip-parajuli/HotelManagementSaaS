from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import FrontDeskViewSet

router = DefaultRouter()
router.register(r"", FrontDeskViewSet, basename="frontdesk")

urlpatterns = [
    path("", include(router.urls)),
]
