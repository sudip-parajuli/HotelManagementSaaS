"""
SIA HMS — Root URL Configuration (Tenant-aware)
"""

from django.contrib import admin
from django.urls import path, include
from django.conf import settings
from django.conf.urls.static import static

urlpatterns = [
    path("admin/", admin.site.urls),
    # Auth
    path("api/auth/", include("apps.accounts.urls")),
    # Properties & Rooms
    path("api/properties/", include("apps.properties.urls")),
    # Bookings
    path("api/bookings/", include("apps.bookings.urls")),
    # Front Desk
    path("api/frontdesk/", include("apps.frontdesk.urls")),
    # Restaurant & POS
    path("api/restaurant/", include("apps.restaurant.urls")),
    path("api/pos/", include("apps.pos.urls")),
    # Housekeeping
    path("api/housekeeping/", include("apps.housekeeping.urls")),
    # Billing & Payments
    path("api/billing/", include("apps.billing.urls")),
    path("api/payments/", include("apps.payments.urls")),
    # Staff, HR, Payroll
    path("api/staff/", include("apps.staff.urls")),
    path("api/hr/", include("apps.hr.urls")),
    path("api/payroll/", include("apps.payroll.urls")),
    # Inventory
    path("api/inventory/", include("apps.inventory.urls")),
    # CRM & Loyalty
    path("api/crm/", include("apps.crm.urls")),
    # Analytics & Reports
    path("api/analytics/", include("apps.analytics.urls")),
    # Notifications
    path("api/notifications/", include("apps.notifications.urls")),
    # Super Admin & Subscriptions
    path("api/admin/", include("apps.subscriptions.urls")),
]

# Serve media files in development
if settings.DEBUG:
    urlpatterns += static(settings.MEDIA_URL, document_root=settings.MEDIA_ROOT)
    urlpatterns += static(settings.STATIC_URL, document_root=settings.STATIC_ROOT)

    # Debug toolbar
    import debug_toolbar
    urlpatterns += [path("__debug__/", include(debug_toolbar.urls))]
