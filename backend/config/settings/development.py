"""
SIA HMS — Development Settings
"""
from .base import *  # noqa

DEBUG = True

# Use local SQLite for quick dev if needed, or full PostgreSQL
# For multi-tenancy, PostgreSQL is REQUIRED
# Switch DATABASES in base.py HOST to 'localhost' for local dev without Docker

# CORS — allow all in development
CORS_ALLOW_ALL_ORIGINS = True

# Email — print to console in dev
EMAIL_BACKEND = "django.core.mail.backends.console.EmailBackend"

# Debug Toolbar
INSTALLED_APPS += ["debug_toolbar"]  # noqa: F405
MIDDLEWARE = ["debug_toolbar.middleware.DebugToolbarMiddleware"] + MIDDLEWARE  # noqa: F405

INTERNAL_IPS = ["127.0.0.1", "localhost"]

# MinIO off in local dev by default (use local file storage)
USE_MINIO = False

# Celery — run tasks synchronously in dev for easy testing
# Comment out to use real Celery with Redis
CELERY_TASK_ALWAYS_EAGER = False
CELERY_TASK_EAGER_PROPAGATES = True

# Disable password validation in dev
AUTH_PASSWORD_VALIDATORS = []
