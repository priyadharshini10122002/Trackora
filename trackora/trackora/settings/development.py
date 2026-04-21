"""
Development settings for Trackora project.
"""

from .base import *

DEBUG = True

# Development-specific apps
INSTALLED_APPS += [
    'debug_toolbar',
    'django_extensions',
]

# Debug Toolbar Middleware
MIDDLEWARE += [
    'debug_toolbar.middleware.DebugToolbarMiddleware',
]

# Debug Toolbar Configuration
INTERNAL_IPS = [
    '127.0.0.1',
    'localhost',
]

# Disable throttling in development
REST_FRAMEWORK['DEFAULT_THROTTLE_RATES'] = {
    'anon': '10000/hour',
    'user': '100000/hour',
}

# Console email backend for development
EMAIL_BACKEND = 'django.core.mail.backends.console.EmailBackend'

# Use local memory cache instead of Redis for development
# This avoids needing a Redis server running locally
CACHES = {
    'default': {
        'BACKEND': 'django.core.cache.backends.locmem.LocMemCache',
        'LOCATION': 'unique-snowflake',
        'OPTIONS': {
            'MAX_ENTRIES': 10000,
        },
        'KEY_PREFIX': 'trackora',
        'TIMEOUT': 300,  # 5 minutes default
    }
}

# Logging - more verbose in development
LOGGING['loggers']['django']['level'] = 'DEBUG'
LOGGING['loggers']['trackora']['level'] = 'DEBUG'
LOGGING['loggers']['apps']['level'] = 'DEBUG'

# Disable HTTPS redirects in development
SECURE_SSL_REDIRECT = False

# CORS - allow all origins in development
CORS_ALLOW_ALL_ORIGINS = True
