"""Staywired API on Vercel; PostgreSQL is hosted by Supabase.

Use the production/container profile when running Redis workers and shared
Channels. This profile runs requested Celery work synchronously and does not
pretend that process-local caches or channel layers are shared infrastructure.
"""
from .production import *  # noqa: F403,F401
from django.core.exceptions import ImproperlyConfigured

USE_X_FORWARDED_HOST = False
ALLOWED_HOSTS = config("ALLOWED_HOSTS", default="staywired-api.vercel.app,staywired.vercel.app", cast=Csv())
CSRF_TRUSTED_ORIGINS = config("CSRF_TRUSTED_ORIGINS", default="https://staywired.vercel.app,https://staywired-api.vercel.app", cast=Csv())
CORS_ALLOWED_ORIGINS = config("CORS_ALLOWED_ORIGINS", default="https://staywired.vercel.app", cast=Csv())

STAYWIRED_PROXY_SECRET = config("STAYWIRED_PROXY_SECRET", default="")
STAYWIRED_FRONTEND_HOSTS = config("STAYWIRED_FRONTEND_HOSTS", default="staywired.vercel.app", cast=Csv())
if not STAYWIRED_PROXY_SECRET:
    raise ImproperlyConfigured("STAYWIRED_PROXY_SECRET must be configured for the Vercel API.")
MIDDLEWARE = ["apps.tenants.proxy.TrustedFrontendMiddleware"] + MIDDLEWARE

DATABASES["default"]["OPTIONS"]["sslmode"] = "require"
DATABASES["default"]["CONN_MAX_AGE"] = 0
DATABASES["default"]["DISABLE_SERVER_SIDE_CURSORS"] = True

# No Redis server is silently assumed to exist inside a function.
CACHES = {"default": {"BACKEND": "django.core.cache.backends.locmem.LocMemCache", "LOCATION": "staywired-vercel"}}
CHANNEL_LAYERS = {"default": {"BACKEND": "channels.layers.InMemoryChannelLayer"}}
CELERY_TASK_ALWAYS_EAGER = True
CELERY_TASK_EAGER_PROPAGATES = False
CELERY_TASK_STORE_EAGER_RESULT = False
CELERY_BROKER_URL = "memory://"
CELERY_RESULT_BACKEND = "cache+memory://"

# Ephemeral disks cannot hold guest uploads. Enable durable object storage
# only when its credentials are provided; otherwise reject writes explicitly.
USE_MINIO = False
STORAGES = {
    "default": {"BACKEND": "apps.tenants.storage.PrivateBlobStorage" if config("BLOB_READ_WRITE_TOKEN", default="") else "apps.tenants.storage.UnconfiguredMediaStorage"},
    "staticfiles": {"BACKEND": "django.contrib.staticfiles.storage.StaticFilesStorage"},
}
MEDIA_ROOT = "/tmp/staywired-media"
STAYWIRED_RUNTIME = "vercel"

STAYWIRED_CRON_SECRET = config("STAYWIRED_CRON_SECRET", default="")
