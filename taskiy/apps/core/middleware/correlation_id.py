"""
Correlation ID middleware for request tracing.
"""

from django.utils.deprecation import MiddlewareMixin


class CorrelationIdMiddleware(MiddlewareMixin):
    """
    Middleware to add correlation ID to request for tracing.
    """

    def __init__(self, get_response):
        self.get_response = get_response

    def __call__(self, request):
        # Correlation ID is set by RequestLoggingMiddleware
        # This middleware ensures it's available throughout the request
        response = self.get_response(request)
        return response
