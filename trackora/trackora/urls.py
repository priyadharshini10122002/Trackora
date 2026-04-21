"""
URL configuration for trackora project.

The `urlpatterns` list routes URLs to views. For more information please see:
    https://docs.djangoproject.com/en/5.1/topics/http/urls/
Examples:
Function views
    1. Add an import:  from my_app import views
    2. Add a URL to urlpatterns:  path('', views.home, name='home')
Class-based views
    1. Add an import:  from other_app.views import Home
    2. Add a URL to urlpatterns:  path('', Home.as_view(), name='home')
Including another URLconf
    1. Import the include() function: from django.urls import include, path
    1. Add a URL to urlpatterns:  path('blog/', include('blog.urls'))
"""
from django.conf import settings
from django.contrib import admin
from django.urls import path, include
from drf_spectacular.views import SpectacularAPIView, SpectacularSwaggerView, SpectacularRedocView
from apps.core.health_checks import (
    health_check,
    database_health_check,
    redis_health_check,
    celery_health_check,
)

urlpatterns = [
    path("admin/", admin.site.urls),
    path('api/schema/', SpectacularAPIView.as_view(), name='schema'),
    path('api/docs/swagger/', SpectacularSwaggerView.as_view(url_name='schema'), name='swagger-ui'),
    path('api/docs/redoc/', SpectacularRedocView.as_view(url_name='schema'), name='redoc'),
    path('api/v1/', include([
        path('', include('apps.tasks.api.urls')),
        path('', include('apps.users.api.urls')),
        path('', include('apps.notifications.api.urls')),
    ])),
    path('api/', include([
        path('', include('apps.tasks.api.urls')),
        path('', include('apps.users.api.urls')),
        path('', include('apps.notifications.api.urls')),
    ])),
    # Health check endpoints
    path('health/', health_check, name='health_check'),
    path('health/db/', database_health_check, name='database_health_check'),
    path('health/redis/', redis_health_check, name='redis_health_check'),
    path('health/celery/', celery_health_check, name='celery_health_check'),
]

if settings.DEBUG:
    import debug_toolbar
    urlpatterns += [
        path("__debug__/", include(debug_toolbar.urls)),
    ]