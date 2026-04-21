"""
Health check endpoints for Trackora.
"""

import logging
from django.http import JsonResponse
from django.db import connection
from django.core.cache import cache
from celery import Celery


logger = logging.getLogger(__name__)


def health_check(request):
    """
    Overall health check endpoint.
    Returns status of all critical services.
    """
    health_status = {
        'status': 'healthy',
        'services': {},
        'timestamp': None,  # Will be set by middleware
    }

    # Check database
    try:
        db_status = _check_database()
        health_status['services']['database'] = db_status
        if not db_status['healthy']:
            health_status['status'] = 'unhealthy'
    except Exception as e:
        logger.error(f"Database health check failed: {e}")
        health_status['services']['database'] = {'healthy': False, 'error': str(e)}
        health_status['status'] = 'unhealthy'

    # Check Redis
    try:
        redis_status = _check_redis()
        health_status['services']['redis'] = redis_status
        if not redis_status['healthy']:
            health_status['status'] = 'unhealthy'
    except Exception as e:
        logger.error(f"Redis health check failed: {e}")
        health_status['services']['redis'] = {'healthy': False, 'error': str(e)}
        health_status['status'] = 'unhealthy'

    # Check Celery
    try:
        celery_status = _check_celery()
        health_status['services']['celery'] = celery_status
        if not celery_status['healthy']:
            health_status['status'] = 'unhealthy'
    except Exception as e:
        logger.error(f"Celery health check failed: {e}")
        health_status['services']['celery'] = {'healthy': False, 'error': str(e)}
        health_status['status'] = 'unhealthy'

    status_code = 200 if health_status['status'] == 'healthy' else 503
    return JsonResponse(health_status, status=status_code)


def database_health_check(request):
    """
    Database-specific health check.
    """
    try:
        db_status = _check_database()
        status_code = 200 if db_status['healthy'] else 503
        return JsonResponse(db_status, status=status_code)
    except Exception as e:
        logger.error(f"Database health check failed: {e}")
        return JsonResponse(
            {'healthy': False, 'error': str(e)},
            status=503
        )


def redis_health_check(request):
    """
    Redis-specific health check.
    """
    try:
        redis_status = _check_redis()
        status_code = 200 if redis_status['healthy'] else 503
        return JsonResponse(redis_status, status=status_code)
    except Exception as e:
        logger.error(f"Redis health check failed: {e}")
        return JsonResponse(
            {'healthy': False, 'error': str(e)},
            status=503
        )


def celery_health_check(request):
    """
    Celery-specific health check.
    """
    try:
        celery_status = _check_celery()
        status_code = 200 if celery_status['healthy'] else 503
        return JsonResponse(celery_status, status=status_code)
    except Exception as e:
        logger.error(f"Celery health check failed: {e}")
        return JsonResponse(
            {'healthy': False, 'error': str(e)},
            status=503
        )


def _check_database():
    """
    Check database connectivity and basic query execution.
    """
    try:
        with connection.cursor() as cursor:
            cursor.execute("SELECT 1")
            result = cursor.fetchone()
            return {
                'healthy': True,
                'response_time_ms': None,  # Could be measured
                'details': 'Database connection successful'
            }
    except Exception as e:
        return {
            'healthy': False,
            'error': str(e),
            'details': 'Database connection failed'
        }


def _check_redis():
    """
    Check Redis connectivity.
    """
    try:
        # Try to get Redis client from cache backend
        redis_client = cache._cache.get_client()

        # Test connection with ping
        redis_client.ping()

        # Optional: Check memory usage
        info = redis_client.info()
        memory_usage = info.get('used_memory_human', 'Unknown')

        return {
            'healthy': True,
            'memory_usage': memory_usage,
            'details': 'Redis connection successful'
        }
    except Exception as e:
        return {
            'healthy': False,
            'error': str(e),
            'details': 'Redis connection failed'
        }


def _check_celery():
    """
    Check Celery connectivity and worker status.
    """
    try:
        # Create Celery app instance
        app = Celery('trackora')
        app.config_from_object('django.conf:settings', namespace='CELERY')

        # Try to inspect active workers
        inspect = app.control.inspect(timeout=1.0)

        # Check if any workers are available
        active_workers = inspect.active()
        stats = inspect.stats()

        if active_workers and stats:
            worker_count = len(active_workers)
            return {
                'healthy': True,
                'active_workers': worker_count,
                'details': f'{worker_count} Celery worker(s) active'
            }
        else:
            return {
                'healthy': False,
                'error': 'No active Celery workers found',
                'details': 'Celery workers may not be running'
            }

    except Exception as e:
        return {
            'healthy': False,
            'error': str(e),
            'details': 'Celery connection failed'
        }
