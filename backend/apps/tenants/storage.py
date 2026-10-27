from django.core.exceptions import ImproperlyConfigured
from django.core.files.storage import Storage


class UnconfiguredMediaStorage(Storage):
    """Fail explicitly instead of losing hotel uploads on an ephemeral disk."""
    message = "Durable media storage has not been configured for this deployment."

    def _save(self, name, content):
        raise ImproperlyConfigured(self.message)

    def _open(self, name, mode="rb"):
        raise ImproperlyConfigured(self.message)

    def exists(self, name):
        return False

    def url(self, name):
        raise ImproperlyConfigured(self.message)


class PrivateBlobStorage(Storage):
    """Tenant-scoped, private durable files with five-minute signed read URLs."""
    MAX_BYTES = 3 * 1024 * 1024
    TYPES = {".jpg": "image/jpeg", ".jpeg": "image/jpeg", ".png": "image/png", ".webp": "image/webp", ".pdf": "application/pdf", ".csv": "text/csv", ".xlsx": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"}

    @staticmethod
    def validate_name(name, scoped=True):
        from pathlib import PurePosixPath
        from django.db import connection
        from django.core.exceptions import SuspiciousFileOperation
        parts = PurePosixPath(name).parts
        if not parts or name.startswith("/") or "\\" in name or any(p in (".", "..") for p in name.split("/")) or ":" in name:
            raise SuspiciousFileOperation("Invalid media path.")
        if scoped and parts[0] != connection.schema_name:
            raise SuspiciousFileOperation("Media belongs to a different workspace.")
        return name

    def _save(self, name, content):
        from pathlib import PurePosixPath
        from uuid import uuid4
        from django.db import connection
        from django.core.exceptions import ValidationError
        from vercel.blob.sync import put_blob
        suffix = PurePosixPath(name).suffix.lower()
        if suffix not in self.TYPES:
            raise ValidationError("Upload a PNG, JPEG, WebP, PDF, CSV or XLSX file.")
        data = content.read(self.MAX_BYTES + 1)
        if len(data) > self.MAX_BYTES:
            raise ValidationError("Files must be 3 MB or smaller.")
        key = f"{connection.schema_name}/{uuid4().hex}{suffix}"
        put_blob(key, data, access="private", content_type=self.TYPES[suffix], allow_overwrite=False)
        return key

    def _open(self, name, mode="rb"):
        from django.core.files.base import ContentFile
        from vercel.blob.sync import get_blob
        self.validate_name(name)
        return ContentFile(get_blob(name, access="private").body, name=name)

    def get_available_name(self, name, max_length=None):
        return name  # _save creates an independent UUID; never overwrite a key.

    def exists(self, name):
        from vercel.blob.sync import head_blob
        from vercel.blob.errors import BlobNotFoundError
        self.validate_name(name)
        try:
            head_blob(name)
            return True
        except BlobNotFoundError:
            return False

    def delete(self, name):
        from vercel.blob.sync import delete_blob
        self.validate_name(name)
        delete_blob(name)

    def url(self, name):
        from django.core import signing
        from urllib.parse import urlencode
        self.validate_name(name)
        token = signing.dumps({"path": name}, salt="staywired-private-media")
        return "/api/media/private/?" + urlencode({"token": token})


def private_media(request):
    """A signed capability issued only while serializing an authorized file field."""
    from pathlib import PurePosixPath
    from django.core import signing
    from django.http import HttpResponse, HttpResponseNotAllowed
    from vercel.blob.sync import get_blob
    from vercel.blob.errors import BlobNotFoundError
    if request.method != "GET":
        return HttpResponseNotAllowed(["GET"])
    try:
        payload = signing.loads(request.GET.get("token", ""), salt="staywired-private-media", max_age=300)
        name = PrivateBlobStorage.validate_name(payload["path"], scoped=False)
        suffix = PurePosixPath(name).suffix.lower()
        if suffix not in PrivateBlobStorage.TYPES:
            raise ValueError("Unsupported type")
        result = get_blob(name, access="private")
    except (signing.BadSignature, KeyError, TypeError, ValueError, BlobNotFoundError):
        return HttpResponse(status=404)
    response = HttpResponse(result.body, content_type=PrivateBlobStorage.TYPES[suffix])
    response["Cache-Control"] = "private, no-store"
    response["X-Content-Type-Options"] = "nosniff"
    response["Content-Security-Policy"] = "default-src 'none'; sandbox"
    response["Content-Disposition"] = f'attachment; filename="download{suffix}"'
    if suffix in (".png", ".jpg", ".jpeg", ".webp"):
        response["Content-Disposition"] = 'inline'
    return response
