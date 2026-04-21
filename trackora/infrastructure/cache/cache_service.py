"""
Cache service implementation for Trackora.
"""

import json
import logging
import hashlib
from functools import wraps
from typing import Any, Optional, Union
from uuid import UUID
from django.core.cache import cache
from django.conf import settings


logger = logging.getLogger(__name__)


class CacheService:
    """
    Centralized cache service with consistent key patterns and TTL management.
    """

    # Cache key prefixes
    KEY_PREFIX_USER = "user"
    KEY_PREFIX_TASK = "task"
    KEY_PREFIX_NOTIFICATION = "notification"
    KEY_PREFIX_STATS = "stats"

    # Default TTL values (in seconds)
    TTL_SHORT = 300  # 5 minutes
    TTL_MEDIUM = 1800  # 30 minutes
    TTL_LONG = 3600  # 1 hour
    TTL_EXTRA_LONG = 86400  # 24 hours

    @classmethod
    def _make_key(cls, prefix: str, *parts: Union[str, int, UUID]) -> str:
        """Create a consistent cache key from parts"""
        key_parts = [prefix] + [str(part) for part in parts]
        return ":".join(key_parts)

    @classmethod
    def get(cls, key: str) -> Any:
        """Get value from cache"""
        try:
            return cache.get(key)
        except Exception as e:
            logger.warning(f"Cache get failed for key {key}: {e}")
            return None

    @classmethod
    def set(cls, key: str, value: Any, ttl: Optional[int] = None) -> bool:
        """Set value in cache with TTL"""
        if ttl is None:
            ttl = cls.TTL_MEDIUM

        try:
            return cache.set(key, value, ttl)
        except Exception as e:
            logger.warning(f"Cache set failed for key {key}: {e}")
            return False

    @classmethod
    def delete(cls, key: str) -> bool:
        """Delete value from cache"""
        try:
            return cache.delete(key)
        except Exception as e:
            logger.warning(f"Cache delete failed for key {key}: {e}")
            return False

    @classmethod
    def delete_pattern(cls, pattern: str) -> int:
        """Delete all keys matching pattern (Redis-specific)"""
        try:
            # This requires Redis cache backend
            if hasattr(cache, '_cache'):
                redis_client = cache._cache.get_client()
                keys = redis_client.keys(f"*{pattern}*")
                if keys:
                    return redis_client.delete(*keys)
            return 0
        except Exception as e:
            logger.warning(f"Cache delete pattern failed for {pattern}: {e}")
            return 0

    # User-related cache methods
    @classmethod
    def get_user_profile(cls, user_id: Union[str, UUID]) -> Optional[dict]:
        """Get cached user profile"""
        key = cls._make_key(cls.KEY_PREFIX_USER, "profile", user_id)
        return cls.get(key)

    @classmethod
    def set_user_profile(cls, user_id: Union[str, UUID], profile_data: dict) -> bool:
        """Cache user profile"""
        key = cls._make_key(cls.KEY_PREFIX_USER, "profile", user_id)
        return cls.set(key, profile_data, cls.TTL_MEDIUM)

    @classmethod
    def invalidate_user_profile(cls, user_id: Union[str, UUID]) -> bool:
        """Invalidate user profile cache"""
        key = cls._make_key(cls.KEY_PREFIX_USER, "profile", user_id)
        return cls.delete(key)

    @classmethod
    def get_user_permissions(cls, user_id: Union[str, UUID]) -> Optional[list]:
        """Get cached user permissions"""
        key = cls._make_key(cls.KEY_PREFIX_USER, "permissions", user_id)
        return cls.get(key)

    @classmethod
    def set_user_permissions(cls, user_id: Union[str, UUID], permissions: list) -> bool:
        """Cache user permissions"""
        key = cls._make_key(cls.KEY_PREFIX_USER, "permissions", user_id)
        return cls.set(key, permissions, cls.TTL_SHORT)

    # Task-related cache methods
    @classmethod
    def get_task_detail(cls, task_id: Union[str, UUID]) -> Optional[dict]:
        """Get cached task detail"""
        key = cls._make_key(cls.KEY_PREFIX_TASK, "detail", task_id)
        return cls.get(key)

    @classmethod
    def set_task_detail(cls, task_id: Union[str, UUID], task_data: dict) -> bool:
        """Cache task detail"""
        key = cls._make_key(cls.KEY_PREFIX_TASK, "detail", task_id)
        return cls.set(key, task_data, cls.TTL_SHORT)

    @classmethod
    def invalidate_task_detail(cls, task_id: Union[str, UUID]) -> bool:
        """Invalidate task detail cache"""
        key = cls._make_key(cls.KEY_PREFIX_TASK, "detail", task_id)
        return cls.delete(key)

    @classmethod
    def get_task_list(cls, filters: dict) -> Optional[list]:
        """Get cached task list with filters"""
        # Create a deterministic key from filters
        filter_str = json.dumps(filters, sort_keys=True)
        filter_hash = hashlib.sha256(filter_str.encode("utf-8")).hexdigest()[:16]
        key = cls._make_key(cls.KEY_PREFIX_TASK, "list", filter_hash)
        return cls.get(key)

    @classmethod
    def set_task_list(cls, filters: dict, task_list: list) -> bool:
        """Cache task list with filters"""
        filter_str = json.dumps(filters, sort_keys=True)
        filter_hash = hashlib.sha256(filter_str.encode("utf-8")).hexdigest()[:16]
        key = cls._make_key(cls.KEY_PREFIX_TASK, "list", filter_hash)
        return cls.set(key, task_list, cls.TTL_SHORT)

    # Statistics cache methods
    @classmethod
    def get_task_stats(cls, user_id: Optional[Union[str, UUID]] = None) -> Optional[dict]:
        """Get cached task statistics"""
        if user_id:
            key = cls._make_key(cls.KEY_PREFIX_STATS, "tasks", "user", user_id)
        else:
            key = cls._make_key(cls.KEY_PREFIX_STATS, "tasks", "global")
        return cls.get(key)

    @classmethod
    def set_task_stats(cls, stats: dict, user_id: Optional[Union[str, UUID]] = None) -> bool:
        """Cache task statistics"""
        if user_id:
            key = cls._make_key(cls.KEY_PREFIX_STATS, "tasks", "user", user_id)
        else:
            key = cls._make_key(cls.KEY_PREFIX_STATS, "tasks", "global")
        return cls.set(key, stats, cls.TTL_MEDIUM)

    @classmethod
    def invalidate_task_stats(cls, user_id: Optional[Union[str, UUID]] = None) -> bool:
        """Invalidate task statistics cache"""
        if user_id:
            key = cls._make_key(cls.KEY_PREFIX_STATS, "tasks", "user", user_id)
        else:
            key = cls._make_key(cls.KEY_PREFIX_STATS, "tasks", "global")
        return cls.delete(key)

    # Notification cache methods
    @classmethod
    def get_user_notifications(cls, user_id: Union[str, UUID], page: int = 1) -> Optional[list]:
        """Get cached user notifications"""
        key = cls._make_key(cls.KEY_PREFIX_NOTIFICATION, "user", user_id, "page", page)
        return cls.get(key)

    @classmethod
    def set_user_notifications(cls, user_id: Union[str, UUID], notifications: list, page: int = 1) -> bool:
        """Cache user notifications"""
        key = cls._make_key(cls.KEY_PREFIX_NOTIFICATION, "user", user_id, "page", page)
        return cls.set(key, notifications, cls.TTL_SHORT)

    @classmethod
    def invalidate_user_notifications(cls, user_id: Union[str, UUID]) -> bool:
        """Invalidate all user notification caches"""
        pattern = cls._make_key(cls.KEY_PREFIX_NOTIFICATION, "user", user_id)
        return cls.delete_pattern(pattern) > 0

    # Utility methods
    @classmethod
    def clear_all(cls) -> bool:
        """Clear all cache (use with caution)"""
        try:
            return cache.clear()
        except Exception as e:
            logger.error(f"Cache clear failed: {e}")
            return False

    @classmethod
    def get_cache_info(cls) -> dict:
        """Get cache backend information"""
        try:
            info = {
                'backend': settings.CACHES['default']['BACKEND'],
                'location': settings.CACHES['default'].get('LOCATION', 'unknown'),
            }

            # Try to get Redis-specific info
            if hasattr(cache, '_cache'):
                redis_client = cache._cache.get_client()
                redis_info = redis_client.info()
                info.update({
                    'redis_version': redis_info.get('redis_version'),
                    'connected_clients': redis_info.get('connected_clients'),
                    'used_memory_human': redis_info.get('used_memory_human'),
                })

            return info
        except Exception as e:
            logger.warning(f"Failed to get cache info: {e}")
            return {'error': str(e)}


# Cache decorators for easy use
def cache_result(ttl: Optional[int] = None, key_prefix: str = ""):
    """
    Decorator to cache function results.

    Usage:
    @cache_result(ttl=300, key_prefix="my_func")
    def my_function(arg1, arg2):
        return expensive_operation(arg1, arg2)
    """
    def decorator(func):
        @wraps(func)
        def wrapper(*args, **kwargs):
            # Create cache key from function name and arguments
            key_parts = [key_prefix or func.__name__]
            key_parts.extend([str(arg) for arg in args])
            key_parts.extend([f"{k}:{v}" for k, v in sorted(kwargs.items())])
            cache_key = ":".join(key_parts)

            # Try to get from cache first
            result = CacheService.get(cache_key)
            if result is not None:
                return result

            # Execute function and cache result
            result = func(*args, **kwargs)
            CacheService.set(cache_key, result, ttl)
            return result

        return wrapper
    return decorator


def invalidate_cache(pattern: str):
    """
    Decorator to invalidate cache after function execution.

    Usage:
    @invalidate_cache("user:profile:*")
    def update_user_profile(user_id, data):
        # Update logic here
        pass
    """
    def decorator(func):
        @wraps(func)
        def wrapper(*args, **kwargs):
            result = func(*args, **kwargs)
            CacheService.delete_pattern(pattern)
            return result

        return wrapper
    return decorator
