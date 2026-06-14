"""
SIA HMS — Base Django Settings
Shared across all environments. Import this in development.py and production.py.
"""

from pathlib import Path
from datetime import timedelta
from decouple import config, Csv

# ─────────────────────────────
# Base Paths
# ─────────────────────────────
BASE_DIR = Path(__file__).resolve().parent.parent.parent

# ─────────────────────────────
# Security
# ─────────────────────────────
SECRET_KEY = config("DJANGO_SECRET_KEY")
ALLOWED_HOSTS = config("ALLOWED_HOSTS", default="localhost,127.0.0.1", cast=Csv())
USE_X_FORWARDED_HOST = True

# ─────────────────────────────
# Multi-Tenant Apps (django-tenants)
# ─────────────────────────────
SHARED_APPS = [
    # django-tenants must be first
    "django_tenants",
    # Django built-ins (shared)
    "django.contrib.contenttypes",
    "django.contrib.admin",
    "django.contrib.auth",
    "django.contrib.sessions",
    "django.contrib.messages",
    "django.contrib.staticfiles",
    # Third-party (shared)
    "rest_framework",
    "rest_framework_simplejwt",
    "rest_framework_simplejwt.token_blacklist",
    "corsheaders",
    "django_filters",
    "django_celery_beat",
    # SIA shared apps
    "apps.tenants",
    "apps.accounts",
    "apps.subscriptions",
]

TENANT_APPS = [
    # Tenant-specific Django
    "django.contrib.auth",
    "django.contrib.contenttypes",
    # SIA tenant apps
    "apps.properties",
    "apps.bookings",
    "apps.frontdesk",
    "apps.restaurant",
    "apps.pos",
    "apps.housekeeping",
    "apps.billing",
    "apps.payments",
    "apps.staff",
    "apps.hr",
    "apps.payroll",
    "apps.inventory",
    "apps.crm",
    "apps.loyalty",
    "apps.analytics",
    "apps.reports",
    "apps.notifications",
]

INSTALLED_APPS = list(SHARED_APPS) + [app for app in TENANT_APPS if app not in SHARED_APPS]

# ─────────────────────────────
# django-tenants Configuration
# ─────────────────────────────
TENANT_MODEL = "tenants.Client"
TENANT_DOMAIN_MODEL = "tenants.Domain"
PUBLIC_SCHEMA_URLCONF = "config.urls_public"
SHOW_PUBLIC_IF_NO_TENANT_FOUND = False

# ─────────────────────────────
# Middleware
# ─────────────────────────────
MIDDLEWARE = [
    "django_tenants.middleware.main.TenantMainMiddleware",
    "apps.tenants.middleware.ImpersonationMiddleware",
    "django.middleware.security.SecurityMiddleware",
    "corsheaders.middleware.CorsMiddleware",
    "django.contrib.sessions.middleware.SessionMiddleware",
    "django.middleware.common.CommonMiddleware",
    "django.middleware.csrf.CsrfViewMiddleware",
    "django.contrib.auth.middleware.AuthenticationMiddleware",
    "django.contrib.messages.middleware.MessageMiddleware",
    "django.middleware.clickjacking.XFrameOptionsMiddleware",
]

# ─────────────────────────────
# URLs
# ─────────────────────────────
ROOT_URLCONF = "config.urls"

# ─────────────────────────────
# Templates
# ─────────────────────────────
TEMPLATES = [
    {
        "BACKEND": "django.template.backends.django.DjangoTemplates",
        "DIRS": [BASE_DIR / "templates"],
        "APP_DIRS": True,
        "OPTIONS": {
            "context_processors": [
                "django.template.context_processors.debug",
                "django.template.context_processors.request",
                "django.contrib.auth.context_processors.auth",
                "django.contrib.messages.context_processors.messages",
            ],
        },
    },
]

# ─────────────────────────────
# ASGI / WSGI
# ─────────────────────────────
WSGI_APPLICATION = "config.wsgi.application"
ASGI_APPLICATION = "config.asgi.application"

# ─────────────────────────────
# Database (django-tenants PostgreSQL backend)
# ─────────────────────────────
DATABASES = {
    "default": {
        "ENGINE": "django_tenants.postgresql_backend",
        "NAME": config("POSTGRES_DB", default="sia_hms_db"),
        "USER": config("POSTGRES_USER", default="sia_hms_user"),
        "PASSWORD": config("POSTGRES_PASSWORD", default="sia_hms_password"),
        "HOST": config("POSTGRES_HOST", default="localhost"),
        "PORT": config("POSTGRES_PORT", default="5432"),
    }
}

DATABASE_ROUTERS = ["django_tenants.routers.TenantSyncRouter"]

# ─────────────────────────────
# Cache (Redis)
# ─────────────────────────────
CACHES = {
    "default": {
        "BACKEND": "django.core.cache.backends.redis.RedisCache",
        "LOCATION": config("REDIS_URL", default="redis://localhost:6379/0"),
    }
}

# ─────────────────────────────
# Channels (WebSocket)
# ─────────────────────────────
CHANNEL_LAYERS = {
    "default": {
        "BACKEND": "channels_redis.core.RedisChannelLayer",
        "CONFIG": {
            "hosts": [config("REDIS_URL", default="redis://localhost:6379/0")],
        },
    }
}

# ─────────────────────────────
# Custom User Model
# ─────────────────────────────
AUTH_USER_MODEL = "accounts.User"

# ─────────────────────────────
# Password Validation
# ─────────────────────────────
AUTH_PASSWORD_VALIDATORS = [
    {"NAME": "django.contrib.auth.password_validation.UserAttributeSimilarityValidator"},
    {"NAME": "django.contrib.auth.password_validation.MinimumLengthValidator"},
    {"NAME": "django.contrib.auth.password_validation.CommonPasswordValidator"},
    {"NAME": "django.contrib.auth.password_validation.NumericPasswordValidator"},
]

# ─────────────────────────────
# Internationalization
# ─────────────────────────────
LANGUAGE_CODE = "en-us"
TIME_ZONE = "Asia/Kathmandu"
USE_I18N = True
USE_TZ = True

# ─────────────────────────────
# Static & Media Files
# ─────────────────────────────
STATIC_URL = "/static/"
STATIC_ROOT = BASE_DIR / "staticfiles"
MEDIA_URL = "/media/"
MEDIA_ROOT = BASE_DIR / "media"

# ─────────────────────────────
# Default Primary Key
# ─────────────────────────────
DEFAULT_AUTO_FIELD = "django.db.models.BigAutoField"

# ─────────────────────────────
# Django REST Framework
# ─────────────────────────────
REST_FRAMEWORK = {
    "DEFAULT_AUTHENTICATION_CLASSES": (
        "apps.accounts.authentication.CookieJWTAuthentication",
    ),
    "DEFAULT_PERMISSION_CLASSES": (
        "rest_framework.permissions.IsAuthenticated",
    ),
    "DEFAULT_FILTER_BACKENDS": (
        "django_filters.rest_framework.DjangoFilterBackend",
        "rest_framework.filters.SearchFilter",
        "rest_framework.filters.OrderingFilter",
    ),
    "DEFAULT_PAGINATION_CLASS": "rest_framework.pagination.PageNumberPagination",
    "PAGE_SIZE": 25,
    "DEFAULT_RENDERER_CLASSES": (
        "rest_framework.renderers.JSONRenderer",
    ),
    "EXCEPTION_HANDLER": "apps.accounts.exceptions.custom_exception_handler",
}

# ─────────────────────────────
# JWT Configuration (simplejwt)
# ─────────────────────────────
SIMPLE_JWT = {
    "ACCESS_TOKEN_LIFETIME": timedelta(
        minutes=config("JWT_ACCESS_TOKEN_LIFETIME_MINUTES", default=15, cast=int)
    ),
    "REFRESH_TOKEN_LIFETIME": timedelta(
        days=config("JWT_REFRESH_TOKEN_LIFETIME_DAYS", default=7, cast=int)
    ),
    "ROTATE_REFRESH_TOKENS": True,
    "BLACKLIST_AFTER_ROTATION": True,
    "UPDATE_LAST_LOGIN": True,
    "ALGORITHM": "HS256",
    "SIGNING_KEY": config("DJANGO_SECRET_KEY"),
    "AUTH_HEADER_TYPES": ("Bearer",),
    "USER_ID_FIELD": "id",
    "USER_ID_CLAIM": "user_id",
    "TOKEN_OBTAIN_SERIALIZER": "apps.accounts.serializers.CustomTokenObtainPairSerializer",
}

# ─────────────────────────────
# CORS Headers
# ─────────────────────────────
CORS_ALLOWED_ORIGINS = [
    "http://localhost:3000",
    "http://127.0.0.1:3000",
]
CORS_ALLOW_CREDENTIALS = True
CORS_ALLOWED_ORIGIN_REGEXES = [
    r"^https://.*\.siaenterprises\.com\.np$",
]

# ─────────────────────────────
# CSRF
# ─────────────────────────────
CSRF_TRUSTED_ORIGINS = [
    "http://localhost:3000",
    "https://*.siaenterprises.com.np",
]

# ─────────────────────────────
# File Storage (MinIO via django-storages)
# ─────────────────────────────
USE_MINIO = config("USE_MINIO", default=False, cast=bool)

if USE_MINIO:
    DEFAULT_FILE_STORAGE = "storages.backends.s3boto3.S3Boto3Storage"
    AWS_ACCESS_KEY_ID = config("AWS_ACCESS_KEY_ID")
    AWS_SECRET_ACCESS_KEY = config("AWS_SECRET_ACCESS_KEY")
    AWS_STORAGE_BUCKET_NAME = config("AWS_STORAGE_BUCKET_NAME", default="sia-hms-media")
    AWS_S3_ENDPOINT_URL = config("AWS_S3_ENDPOINT_URL", default="http://minio:9000")
    AWS_S3_USE_SSL = config("AWS_S3_USE_SSL", default=False, cast=bool)
    AWS_DEFAULT_ACL = "public-read"
    AWS_S3_FILE_OVERWRITE = False
    AWS_QUERYSTRING_AUTH = False
    MEDIA_URL = f"{AWS_S3_ENDPOINT_URL}/{AWS_STORAGE_BUCKET_NAME}/"

# ─────────────────────────────
# Email
# ─────────────────────────────
EMAIL_BACKEND = "django.core.mail.backends.smtp.EmailBackend"
EMAIL_HOST = config("EMAIL_HOST", default="smtp.gmail.com")
EMAIL_PORT = config("EMAIL_PORT", default=587, cast=int)
EMAIL_USE_TLS = config("EMAIL_USE_TLS", default=True, cast=bool)
EMAIL_HOST_USER = config("EMAIL_HOST_USER", default="")
EMAIL_HOST_PASSWORD = config("EMAIL_HOST_PASSWORD", default="")
DEFAULT_FROM_EMAIL = config("DEFAULT_FROM_EMAIL", default="SIA HMS <noreply@siaenterprises.com.np>")

# ─────────────────────────────
# Celery
# ─────────────────────────────
CELERY_BROKER_URL = config("CELERY_BROKER_URL", default="redis://localhost:6379/1")
CELERY_RESULT_BACKEND = config("REDIS_URL", default="redis://localhost:6379/0")
CELERY_ACCEPT_CONTENT = ["json"]
CELERY_TASK_SERIALIZER = "json"
CELERY_RESULT_SERIALIZER = "json"
CELERY_TIMEZONE = "Asia/Kathmandu"
CELERY_TASK_TRACK_STARTED = True
CELERY_TASK_TIME_LIMIT = 30 * 60  # 30 minutes

# ─────────────────────────────
# Sparrow SMS (Nepal)
# ─────────────────────────────
SPARROW_SMS_TOKEN = config("SPARROW_SMS_TOKEN", default="")
SPARROW_SMS_FROM = config("SPARROW_SMS_FROM", default="SIA_HMS")

# ─────────────────────────────
# Payment Gateways
# ─────────────────────────────
ESEWA_MERCHANT_CODE = config("ESEWA_MERCHANT_CODE", default="EPAYTEST")
ESEWA_SECRET_KEY = config("ESEWA_SECRET_KEY", default="")
ESEWA_SANDBOX = config("ESEWA_SANDBOX", default=True, cast=bool)
ESEWA_GATEWAY_URL = config(
    "ESEWA_GATEWAY_URL",
    default="https://rc-epay.esewa.com.np/api/epay/main/v2/form"
)

KHALTI_SECRET_KEY = config("KHALTI_SECRET_KEY", default="")
KHALTI_SANDBOX = config("KHALTI_SANDBOX", default=True, cast=bool)
KHALTI_API_URL = config("KHALTI_API_URL", default="https://a.khalti.com/api/v2")

FONEPAY_MERCHANT_CODE = config("FONEPAY_MERCHANT_CODE", default="")
FONEPAY_SECRET_KEY = config("FONEPAY_SECRET_KEY", default="")
FONEPAY_SANDBOX = config("FONEPAY_SANDBOX", default=True, cast=bool)

# ─────────────────────────────
# Logging
# ─────────────────────────────
LOGGING = {
    "version": 1,
    "disable_existing_loggers": False,
    "formatters": {
        "verbose": {
            "format": "{levelname} {asctime} {module} {process:d} {thread:d} {message}",
            "style": "{",
        },
    },
    "handlers": {
        "console": {
            "class": "logging.StreamHandler",
            "formatter": "verbose",
        },
    },
    "root": {
        "handlers": ["console"],
        "level": "INFO",
    },
    "loggers": {
        "django": {
            "handlers": ["console"],
            "level": "INFO",
            "propagate": False,
        },
        "apps": {
            "handlers": ["console"],
            "level": "DEBUG",
            "propagate": False,
        },
        "celery": {
            "handlers": ["console"],
            "level": "INFO",
            "propagate": False,
        },
    },
}
