"""
SIA HMS — Booking & Reservation URLs
"""

from django.urls import path, include
from rest_framework.routers import DefaultRouter

from .views import (
    GuestProfileViewSet,
    RatePlanViewSet,
    ReservationViewSet,
    PublicAvailabilityView,
    PublicBookingCreateView,
)

router = DefaultRouter()
router.register(r"guests", GuestProfileViewSet, basename="guest")
router.register(r"rate-plans", RatePlanViewSet, basename="rate-plan")
router.register(r"reservations", ReservationViewSet, basename="reservation")

urlpatterns = [
    # Router viewsets
    path("", include(router.urls)),
    
    # Public guest-facing endpoints
    path("public/availability/", PublicAvailabilityView.as_view(), name="public-availability"),
    path("public/bookings/", PublicBookingCreateView.as_view(), name="public-booking-create"),
]
