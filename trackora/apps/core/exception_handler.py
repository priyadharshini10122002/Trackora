"""
Custom exception handler for DRF.
"""

import logging
from django.http import Http404
from rest_framework import status
from rest_framework.response import Response
from rest_framework.views import exception_handler
from django.core.exceptions import ValidationError as DjangoValidationError
from rest_framework.exceptions import ValidationError as DRFValidationError

from domain.exceptions.domain_exceptions import (
    InvalidWorkflowTransitionError,
    PermissionDeniedError,
    BusinessRuleViolation,
    InvalidTaskStateError,
    AssignmentError,
    EntityNotFoundError,
    DuplicateEntityError,
    SLAViolationError,
)


logger = logging.getLogger(__name__)


def custom_exception_handler(exc, context):
    """
    Custom exception handler that provides consistent error responses.
    """
    # Get the standard DRF error response
    response = exception_handler(exc, context)

    if response is not None:
        # DRF handled the exception, but we want to add correlation ID
        request = context.get('request')
        if request and hasattr(request, 'correlation_id'):
            response.data['correlation_id'] = request.correlation_id
        return response

    # Handle custom domain exceptions
    if isinstance(exc, (InvalidWorkflowTransitionError, PermissionDeniedError,
                       BusinessRuleViolation, InvalidTaskStateError, AssignmentError,
                       EntityNotFoundError, DuplicateEntityError, SLAViolationError)):

        return _handle_domain_exception(exc, context)

    # Handle Django's Http404
    if isinstance(exc, Http404):
        return _handle_not_found(exc, context)

    # Handle validation errors
    if isinstance(exc, (DjangoValidationError, DRFValidationError)):
        return _handle_validation_error(exc, context)

    # Handle unexpected exceptions
    return _handle_unexpected_error(exc, context)


def _handle_domain_exception(exc, context):
    """Handle custom domain exceptions."""
    request = context.get('request')

    # Map exception types to HTTP status codes
    status_mapping = {
        InvalidWorkflowTransitionError: status.HTTP_409_CONFLICT,
        PermissionDeniedError: status.HTTP_403_FORBIDDEN,
        BusinessRuleViolation: status.HTTP_400_BAD_REQUEST,
        InvalidTaskStateError: status.HTTP_409_CONFLICT,
        AssignmentError: status.HTTP_400_BAD_REQUEST,
        EntityNotFoundError: status.HTTP_404_NOT_FOUND,
        DuplicateEntityError: status.HTTP_409_CONFLICT,
        SLAViolationError: status.HTTP_400_BAD_REQUEST,
    }

    http_status = status_mapping.get(type(exc), status.HTTP_500_INTERNAL_SERVER_ERROR)

    error_data = {
        'error': exc.__class__.__name__,
        'message': str(exc),
        'type': 'domain_error',
    }

    # Add correlation ID if available
    if request and hasattr(request, 'correlation_id'):
        error_data['correlation_id'] = request.correlation_id

    # Add additional context for some exceptions
    if hasattr(exc, 'details') and exc.details:
        error_data['details'] = exc.details

    # Log the error
    logger.warning(
        f"Domain exception: {exc.__class__.__name__}: {exc}",
        extra={
            'correlation_id': getattr(request, 'correlation_id', None),
            'exception_type': exc.__class__.__name__,
            'status_code': http_status,
        }
    )

    return Response(error_data, status=http_status)


def _handle_not_found(exc, context):
    """Handle 404 errors."""
    request = context.get('request')

    error_data = {
        'error': 'NotFound',
        'message': 'The requested resource was not found.',
        'type': 'client_error',
    }

    if request and hasattr(request, 'correlation_id'):
        error_data['correlation_id'] = request.correlation_id

    return Response(error_data, status=status.HTTP_404_NOT_FOUND)


def _handle_validation_error(exc, context):
    """Handle validation errors."""
    request = context.get('request')

    error_data = {
        'error': 'ValidationError',
        'message': 'Invalid input data.',
        'type': 'validation_error',
        'details': exc.detail if hasattr(exc, 'detail') else str(exc),
    }

    if request and hasattr(request, 'correlation_id'):
        error_data['correlation_id'] = request.correlation_id

    return Response(error_data, status=status.HTTP_400_BAD_REQUEST)


def _handle_unexpected_error(exc, context):
    """Handle unexpected errors."""
    request = context.get('request')

    # Log the full exception
    logger.error(
        f"Unexpected error: {exc}",
        exc_info=True,
        extra={
            'correlation_id': getattr(request, 'correlation_id', None),
            'path': getattr(request, 'path', None) if request else None,
            'method': getattr(request, 'method', None) if request else None,
        }
    )

    error_data = {
        'error': 'InternalServerError',
        'message': 'An unexpected error occurred. Please try again later.',
        'type': 'server_error',
    }

    if request and hasattr(request, 'correlation_id'):
        error_data['correlation_id'] = request.correlation_id

    return Response(error_data, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
