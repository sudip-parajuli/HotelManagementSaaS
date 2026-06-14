"""
SIA HMS — Public Schema URL Configuration
Used for the SaaS admin and public endpoints that operate on the public schema.
"""

from django.contrib import admin
from django.urls import path, include
from apps.subscriptions.public_views import PublicTenantOnboardView

urlpatterns = [
    path("admin/", admin.site.urls),
    # Super admin API endpoints (SIA internal)
    path("api/admin/", include("apps.subscriptions.urls")),
    # Auth (shared — needed on public schema too)
    path("api/auth/", include("apps.accounts.urls")),
    # Public tenant onboarding
    path("api/public/onboard/", PublicTenantOnboardView.as_view(), name="public-onboard"),
    # Public booking endpoints (no auth)
    path("api/public/", include("apps.bookings.urls_public")),
]

from django.conf import settings
if settings.DEBUG:
    import debug_toolbar
    urlpatterns += [path("__debug__/", include(debug_toolbar.urls))]

