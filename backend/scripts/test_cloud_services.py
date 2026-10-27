"""Security checks for durable media and cross-instance event delivery."""
import test_serverless  # Initializes isolated Django settings, without a database.
import unittest
from types import SimpleNamespace
from unittest.mock import patch, MagicMock
from urllib.parse import urlsplit, parse_qs
from django.test import RequestFactory, override_settings
from django.core.files.base import ContentFile
from django.core.exceptions import SuspiciousFileOperation, ValidationError
from rest_framework.test import APIRequestFactory, force_authenticate
from apps.tenants.storage import PrivateBlobStorage, private_media
from apps.tenants.operations import events, tick
from apps.tenants.realtime import DatabaseChannelLayer

class CloudServicesTests(unittest.TestCase):
    def test_media_cannot_issue_cross_workspace_links(self):
        with patch("django.db.connection") as db:
            db.schema_name = "hotel_a"
            with self.assertRaises(SuspiciousFileOperation):
                PrivateBlobStorage().url("hotel_b/private.pdf")
            for path in ("hotel_a/../private.pdf", "https://outside/a.pdf", "/hotel_a/a.pdf"):
                with self.assertRaises(SuspiciousFileOperation):
                    PrivateBlobStorage().url(path)

    def test_private_read_requires_valid_unexpired_capability(self):
        factory = RequestFactory()
        with patch("django.db.connection") as db:
            db.schema_name = "hotel_a"
            url = PrivateBlobStorage().url("hotel_a/photo.png")
        token = parse_qs(urlsplit(url).query)["token"][0]
        with patch("vercel.blob.sync.get_blob", return_value=SimpleNamespace(body=b"image")) as vendor:
            response = private_media(factory.get(url))
            self.assertEqual(response.status_code, 200)
            self.assertEqual(response["Cache-Control"], "private, no-store")
            self.assertEqual(private_media(factory.get(url + "tampered")).status_code, 404)
            self.assertEqual(private_media(factory.get("/api/media/private/")).status_code, 404)
            with patch("django.core.signing.time.time", return_value=10**12):
                self.assertEqual(private_media(factory.get(url)).status_code, 404)
            self.assertEqual(vendor.call_count, 1)

    def test_oversize_or_active_content_never_reaches_storage(self):
        with patch("vercel.blob.sync.put_blob") as vendor:
            for name, data in [("bad.html", b"<script>"), ("large.pdf", b"x"*(PrivateBlobStorage.MAX_BYTES+1))]:
                with self.assertRaises(ValidationError):
                    PrivateBlobStorage()._save(name, ContentFile(data))
            vendor.assert_not_called()

    def test_event_feed_uses_resolved_tenant_and_role(self):
        factory = APIRequestFactory()
        request = factory.get("/api/operations/events/?channel=housekeeping&cursor=0&tenant_schema=hotel_b")
        request.tenant = SimpleNamespace(schema_name="hotel_a")
        force_authenticate(request, user=SimpleNamespace(role="HOUSEKEEPING", is_authenticated=True))
        with patch("apps.tenants.operations.schema_context"), patch("apps.tenants.operations.RealtimeEvent.objects") as objects:
            objects.filter.return_value.filter.return_value.filter.return_value.order_by.return_value.values.return_value = []
            self.assertEqual(events(request).status_code, 200)
            objects.filter.assert_called_once_with(tenant_schema="hotel_a")
        request = factory.get("/api/operations/events/?channel=kds/bar")
        request.tenant = SimpleNamespace(schema_name="hotel_a")
        force_authenticate(request, user=SimpleNamespace(role="HOUSEKEEPING", is_authenticated=True))
        self.assertEqual(events(request).status_code, 403)

    def test_events_publish_only_after_transaction_commit(self):
        callbacks=[]
        with patch("apps.tenants.realtime.transaction.on_commit", side_effect=callbacks.append), patch("apps.tenants.realtime.schema_context"), patch("apps.tenants.models.RealtimeEvent.objects.create") as create:
            DatabaseChannelLayer("hotel_a").enqueue("housekeeping", {"data": {"event": "task_changed"}})
            create.assert_not_called()
            callbacks[0]()
            create.assert_called_once_with(tenant_schema="hotel_a", channel="housekeeping", payload={"event": "task_changed"})

    @override_settings(STAYWIRED_CRON_SECRET="test-secret")
    def test_scheduler_rejects_public_or_wrong_secret_before_database(self):
        factory = RequestFactory()
        with patch("apps.tenants.operations.connection") as db:
            self.assertEqual(tick(factory.post("/api/operations/tick/")).status_code, 401)
            self.assertEqual(tick(factory.post("/api/operations/tick/", HTTP_AUTHORIZATION="Bearer wrong")).status_code, 401)
            db.cursor.assert_not_called()

if __name__ == "__main__":
    unittest.main()
