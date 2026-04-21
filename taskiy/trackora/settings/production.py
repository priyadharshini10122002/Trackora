"""
Production settings for Trackora project.
"""

from .base import *
from decouple import config, Csv

DEBUG = False

# Security Settings
SECURE_SSL_REDIRECT = True
SECURE_PROXY_SSL_HEADER = ('HTTP_X_FORWARDED_PROTO', 'https')
SESSION_COOKIE_SECURE = True
CSRF_COOKIE_SECURE = True
SECURE_HSTS_SECONDS = 31536000  # 1 year
SECURE_HSTS_INCLUDE_SUBDOMAINS = True
SECURE_HSTS_PRELOAD = True
SECURE_REFERRER_POLICY = 'same-origin'

# CSRF trusted origins for reverse proxies/frontends
CSRF_TRUSTED_ORIGINS = config('CSRF_TRUSTED_ORIGINS', default='', cast=Csv())

# Restrict cookies further in production
SESSION_COOKIE_SAMESITE = 'Strict'
CSRF_COOKIE_SAMESITE = 'Strict'

# Production logging - use JSON format
LOGGING['handlers']['console']['formatter'] = 'json'

# Stricter CORS in production
CORS_ALLOW_ALL_ORIGINS = False

# Production email backend
EMAIL_BACKEND = 'django.core.mail.backends.smtp.EmailBackend'

# Static files - use WhiteNoise or CDN in production
STORAGES = {
    'default': {
        'BACKEND': 'django.core.files.storage.FileSystemStorage',
    },
    'staticfiles': {
        'BACKEND': 'django.contrib.staticfiles.storage.ManifestStaticFilesStorage',
    },
}
