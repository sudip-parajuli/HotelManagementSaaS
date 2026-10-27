"""Resolve a tenant host forwarded by our authenticated Next.js server proxy."""
import hmac
from django.conf import settings
from django.http import JsonResponse


class TrustedFrontendMiddleware:
    def __init__(self, get_response):
        self.get_response = get_response

    def __call__(self, request):
        # This endpoint must work before tenant migrations or domain bootstrap.
        if request.path == "/api/health/":
            return JsonResponse({"service": "staywired-api", "status": "ok", "runtime": "vercel"})
        if request.path == "/api/operations/tick/":
            from .operations import tick
            return tick(request)
        host = request.META.get("HTTP_X_STAYWIRED_HOST")
        if host:
            supplied = request.META.get("HTTP_X_STAYWIRED_PROXY_SECRET", "")
            expected = getattr(settings, "STAYWIRED_PROXY_SECRET", "")
            allowed = getattr(settings, "STAYWIRED_FRONTEND_HOSTS", [])
            if not expected or not hmac.compare_digest(supplied, expected) or host not in allowed:
                return JsonResponse({"error": "Invalid frontend proxy context."}, status=403)
            request.META["HTTP_HOST"] = host
        return self.get_response(request)
