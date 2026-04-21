"""
Simple IP-based rate limiting middleware.
"""

import time

from django.conf import settings
from django.core.cache import cache
from django.http import JsonResponse


class RateLimitMiddleware:
    """
    Request-level rate limiter using cache counters.
    """

    def __init__(self, get_response):
        self.get_response = get_response
        self.limit = int(getattr(settings, "RATE_LIMIT_REQUESTS", 300))
        self.window = int(getattr(settings, "RATE_LIMIT_WINDOW_SECONDS", 60))

    def __call__(self, request):
        if request.path.startswith("/health/") or request.path.startswith("/admin/"):
            return self.get_response(request)

        client_ip = self._get_client_ip(request)
        bucket = int(time.time() // self.window)
        key = f"rl:{client_ip}:{bucket}"
        count = cache.get(key, 0)

        if count >= self.limit:
            return JsonResponse(
                {"error": "Too many requests. Please retry shortly."},
                status=429,
            )

        if count == 0:
            cache.set(key, 1, timeout=self.window)
        else:
            cache.incr(key)

        return self.get_response(request)

    @staticmethod
    def _get_client_ip(request):
        x_forwarded_for = request.META.get("HTTP_X_FORWARDED_FOR")
        if x_forwarded_for:
            return x_forwarded_for.split(",")[0].strip()
        return request.META.get("REMOTE_ADDR", "unknown")

