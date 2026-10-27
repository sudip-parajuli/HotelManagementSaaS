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
