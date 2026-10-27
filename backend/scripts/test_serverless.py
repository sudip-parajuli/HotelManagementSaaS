"""Security regression checks without a database: python scripts/test_serverless.py."""
import os
import sys
import unittest
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))
os.environ.setdefault("DJANGO_SECRET_KEY", "serverless-test-only-key")
os.environ.setdefault("STAYWIRED_PROXY_SECRET", "test-only-proxy-secret")
os.environ.setdefault("DJANGO_SETTINGS_MODULE", "config.settings.vercel")
import django
django.setup()
from django.test import RequestFactory, override_settings
from django.http import JsonResponse
from apps.tenants.proxy import TrustedFrontendMiddleware
from apps.tenants.storage import UnconfiguredMediaStorage
from django.core.exceptions import ImproperlyConfigured


class ServerlessTests(unittest.TestCase):
    def setUp(self):
        self.factory = RequestFactory()
        self.handler = TrustedFrontendMiddleware(lambda request: JsonResponse({"host": request.get_host()}))

    def test_health_works_without_database_or_tenant(self):
        self.assertEqual(self.handler(self.factory.get("/api/health/")).status_code, 200)

    @override_settings(STAYWIRED_PROXY_SECRET="test-only-proxy-secret", STAYWIRED_FRONTEND_HOSTS=["staywired.vercel.app"], ALLOWED_HOSTS=["staywired.vercel.app", "staywired-api.vercel.app"])
    def test_trusted_frontend_can_select_registered_host(self):
        response = self.handler(self.factory.get("/api/test/", HTTP_HOST="staywired-api.vercel.app", HTTP_X_STAYWIRED_HOST="staywired.vercel.app", HTTP_X_STAYWIRED_PROXY_SECRET="test-only-proxy-secret"))
        self.assertEqual(response.status_code, 200)
        self.assertIn(b"staywired.vercel.app", response.content)

    def test_untrusted_context_is_rejected(self):
        for host, secret in [("staywired.vercel.app", "wrong"), ("attacker.example", "test-only-proxy-secret")]:
            response = self.handler(self.factory.get("/api/test/", HTTP_X_STAYWIRED_HOST=host, HTTP_X_STAYWIRED_PROXY_SECRET=secret))
            self.assertEqual(response.status_code, 403)

    def test_uploads_cannot_silently_use_ephemeral_disk(self):
        with self.assertRaises(ImproperlyConfigured):
            UnconfiguredMediaStorage()._save("guest-id.png", None)


if __name__ == "__main__":
    unittest.main()
