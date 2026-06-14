"""
SIA HMS — Impersonation Middleware
Allows Super Admins to dynamically route requests based on the tenant_schema claim in JWT.
"""

from rest_framework_simplejwt.tokens import AccessToken
from django.db import connection
from apps.tenants.models import Client

class ImpersonationMiddleware:
    """
    Middleware that inspects the JWT token (from Auth header or cookie)
    for a tenant_schema claim. If found, and the token user role is SUPER_ADMIN,
    it dynamically overrides the active tenant context.
    """
    def __init__(self, get_response):
        self.get_response = get_response

    def __call__(self, request):
        print("MIDDLEWARE DEBUG:")
        print("  Host:", request.get_host())
        print("  Tenant:", getattr(request, 'tenant', None))
        print("  URLConf:", getattr(request, 'urlconf', None))
        raw_token = None
        header = request.META.get("HTTP_AUTHORIZATION")
        if header and header.startswith("Bearer "):
            raw_token = header.split(" ")[1]
        else:
            raw_token = request.COOKIES.get("access_token")

        if raw_token:
            try:
                token = AccessToken(raw_token)
                role = token.get("role")
                tenant_schema = token.get("tenant_schema")

                if tenant_schema and role == "SUPER_ADMIN":
                    # Dynamically route DB connection to target tenant
                    tenant = Client.objects.filter(schema_name=tenant_schema, is_active=True).first()
                    if tenant:
                        connection.set_tenant(tenant)
                        request.tenant = tenant
            except Exception:
                pass

        return self.get_response(request)
