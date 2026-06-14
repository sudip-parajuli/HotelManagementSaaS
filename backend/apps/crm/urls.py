"""
SIA HMS — CRM and Loyalty URL Routing
"""

from django.urls import path, include
from rest_framework.routers import DefaultRouter

from .views import GuestTagViewSet, GuestActivityViewSet, CampaignViewSet, GuestPortfolioViewSet
from apps.loyalty.views import LoyaltyAccountViewSet, LoyaltyTransactionViewSet

router = DefaultRouter()
router.register(r"tags", GuestTagViewSet, basename="guest-tag")
router.register(r"activities", GuestActivityViewSet, basename="guest-activity")
router.register(r"campaigns", CampaignViewSet, basename="campaign")
router.register(r"guests", GuestPortfolioViewSet, basename="guest-portfolio")
router.register(r"loyalty", LoyaltyAccountViewSet, basename="loyalty-account")
router.register(r"loyalty-transactions", LoyaltyTransactionViewSet, basename="loyalty-transaction")

urlpatterns = [
    path("", include(router.urls)),
]
