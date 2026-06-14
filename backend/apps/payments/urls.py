"""
SIA HMS — Payment App URL Configuration
Routes for gateway checkouts, polling checks, and redirects callbacks.
"""

from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import PaymentGatewayViewSet, verify_esewa_redirect, verify_khalti_redirect

router = DefaultRouter()
router.register(r"gateway", PaymentGatewayViewSet, basename="paymentgateway")

urlpatterns = [
    path("", include(router.urls)),
    path("verify-esewa/", verify_esewa_redirect, name="verify-esewa"),
    path("verify-khalti/", verify_khalti_redirect, name="verify-khalti"),
]
