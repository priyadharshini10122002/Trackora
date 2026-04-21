"""
Request logging middleware for Trackora.
"""

import logging
import uuid
import time
from django.utils.deprecation import MiddlewareMixin


logger = logging.getLogger(__name__)


class RequestLoggingMiddleware(MiddlewareMixin):
    """
    Middleware to log all incoming requests with correlation IDs.
    """

    def __init__(self, get_response):
        self.get_response = get_response

    def __call__(self, request):
        # Generate correlation ID for request tracing
        correlation_id = str(uuid.uuid4())
        request.correlation_id = correlation_id

        # Start timing
        start_time = time.time()

        # Log incoming request
        self._log_request(request)

        # Process request
        response = self.get_response(request)

        # Calculate duration
        duration = time.time() - start_time

        # Log response
        self._log_response(request, response, duration)

        return response

    def _log_request(self, request):
        """Log incoming request details."""
        user_id = getattr(request.user, 'id', None) if request.user.is_authenticated else None
        user_email = getattr(request.user, 'email', None) if request.user.is_authenticated else None

        logger.info(
            f"Request: {request.method} {request.path}",
            extra={
                'correlation_id': request.correlation_id,
                'method': request.method,
                'path': request.path,
                'query_string': request.META.get('QUERY_STRING', ''),
                'user_id': user_id,
                'user_email': user_email,
                'remote_addr': self._get_client_ip(request),
                'user_agent': request.META.get('HTTP_USER_AGENT', ''),
                'content_type': request.META.get('CONTENT_TYPE', ''),
                'content_length': request.META.get('CONTENT_LENGTH', ''),
            }
        )

    def _log_response(self, request, response, duration):
        """Log response details."""
        logger.info(
            f"Response: {response.status_code} in {duration:.3f}s",
            extra={
                'correlation_id': request.correlation_id,
                'status_code': response.status_code,
                'duration': round(duration, 3),
                'response_content_length': len(response.content) if hasattr(response, 'content') else 0,
            }
        )

    def _get_client_ip(self, request):
        """Get the client IP address from request."""
        x_forwarded_for = request.META.get('HTTP_X_FORWARDED_FOR')
        if x_forwarded_for:
            # Take the first IP if there are multiple
            ip = x_forwarded_for.split(',')[0].strip()
        else:
            ip = request.META.get('REMOTE_ADDR')
        return ip

    def process_exception(self, request, exception):
        """Log exceptions that occur during request processing."""
        logger.error(
            f"Exception: {exception.__class__.__name__}: {str(exception)}",
            exc_info=True,
            extra={
                'correlation_id': getattr(request, 'correlation_id', None),
                'path': request.path,
                'method': request.method,
                'user_id': getattr(request.user, 'id', None) if request.user.is_authenticated else None,
            }
        )
