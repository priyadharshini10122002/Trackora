"""
API views for User management.
"""

from rest_framework import viewsets, status, serializers as drf_serializers
from rest_framework.decorators import action, api_view, permission_classes
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated, AllowAny
from rest_framework_simplejwt.views import TokenObtainPairView
from rest_framework_simplejwt.tokens import RefreshToken
from django_filters.rest_framework import DjangoFilterBackend
from rest_framework.filters import SearchFilter, OrderingFilter
from drf_spectacular.utils import (
    extend_schema,
    OpenApiExample,
    OpenApiResponse,
    inline_serializer,
)

from apps.users.models import User, Role, UserRole
from apps.users.api.serializers import (
    UserRegistrationSerializer,
    UserProfileSerializer,
    UserUpdateSerializer,
    ChangePasswordSerializer,
    CustomTokenObtainPairSerializer,
    UserListSerializer,
    RoleSerializer,
    UserRoleSerializer,
    UserRoleAssignmentSerializer,
)
from apps.users.api.permissions import (
    IsAdmin,
    CanManageUsers,
    CanAssignRoles,
)


# --------------------------------------------------------------------------
# Inline response serializers for OpenAPI schema generation.
# These don't change runtime behaviour - drf-spectacular uses them to render
# accurate request/response shapes in Swagger UI for function-based views,
# which otherwise wouldn't be introspectable.
# --------------------------------------------------------------------------

_RegisterResponseSerializer = inline_serializer(
    name="RegisterResponse",
    fields={
        "user": UserProfileSerializer(),
        "tokens": inline_serializer(
            name="RegisterTokens",
            fields={
                "refresh": drf_serializers.CharField(),
                "access": drf_serializers.CharField(),
            },
        ),
        "message": drf_serializers.CharField(),
    },
)

_LogoutRequestSerializer = inline_serializer(
    name="LogoutRequest",
    fields={"refresh_token": drf_serializers.CharField()},
)

_MessageResponseSerializer = inline_serializer(
    name="MessageResponse",
    fields={"message": drf_serializers.CharField()},
)

_ErrorResponseSerializer = inline_serializer(
    name="ErrorResponse",
    fields={"error": drf_serializers.CharField()},
)


class CustomTokenObtainPairView(TokenObtainPairView):
    """
    Custom JWT token view with additional user information.
    """
    serializer_class = CustomTokenObtainPairSerializer


@extend_schema(
    tags=["Auth"],
    summary="Register a new user",
    description=(
        "Creates a new user account and returns an access/refresh token pair "
        "so the client can log in immediately without a separate login call."
    ),
    request=UserRegistrationSerializer,
    responses={
        201: _RegisterResponseSerializer,
        400: _ErrorResponseSerializer,
    },
    examples=[
        OpenApiExample(
            "Valid registration",
            value={
                "email": "newuser@example.com",
                "first_name": "New",
                "last_name": "User",
                "password": "StrongPass123!",
                "password_confirm": "StrongPass123!",
            },
            request_only=True,
        ),
    ],
)
@api_view(['POST'])
@permission_classes([AllowAny])
def register_user(request):
    """
    Register a new user.
    """
    serializer = UserRegistrationSerializer(data=request.data)
    if serializer.is_valid():
        user = serializer.save()

        # Generate tokens for immediate login
        refresh = RefreshToken.for_user(user)
        return Response({
            'user': UserProfileSerializer(user).data,
            'tokens': {
                'refresh': str(refresh),
                'access': str(refresh.access_token),
            },
            'message': 'User registered successfully.'
        }, status=status.HTTP_201_CREATED)

    return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


@extend_schema(
    tags=["Auth"],
    summary="Logout (blacklist refresh token)",
    description=(
        "Invalidates the supplied refresh token so it cannot be used to "
        "obtain new access tokens. The client should also discard its "
        "access token locally."
    ),
    request=_LogoutRequestSerializer,
    responses={
        200: _MessageResponseSerializer,
        400: _ErrorResponseSerializer,
    },
    examples=[
        OpenApiExample(
            "Logout",
            value={"refresh_token": "<jwt-refresh-token>"},
            request_only=True,
        ),
    ],
)
@api_view(['POST'])
@permission_classes([IsAuthenticated])
def logout_user(request):
    """
    Logout user by blacklisting refresh token.
    """
    try:
        refresh_token = request.data.get('refresh_token')
        if not refresh_token:
            return Response(
                {'error': 'refresh_token is required.'},
                status=status.HTTP_400_BAD_REQUEST,
            )
        token = RefreshToken(refresh_token)
        token.blacklist()
        return Response({'message': 'Successfully logged out.'})
    except Exception:
        return Response(
            {'error': 'Invalid token.'},
            status=status.HTTP_400_BAD_REQUEST
        )


class UserViewSet(viewsets.ModelViewSet):
    """
    ViewSet for User management.
    """
    queryset = User.objects.all()
    filter_backends = [DjangoFilterBackend, SearchFilter, OrderingFilter]
    filterset_fields = ['is_active']
    search_fields = ['email', 'first_name', 'last_name']
    ordering_fields = ['date_joined', 'last_login', 'email']
    ordering = ['-date_joined']

    def get_serializer_class(self):
        if self.action == 'list':
            return UserListSerializer
        elif self.action in ['update', 'partial_update']:
            return UserUpdateSerializer
        else:
            return UserProfileSerializer

    def get_permissions(self):
        if self.action in ['list', 'retrieve']:
            permission_classes = [IsAuthenticated, CanManageUsers]
        elif self.action in ['update', 'partial_update']:
            permission_classes = [IsAuthenticated]  # Users can update themselves
        else:
            permission_classes = [IsAuthenticated, IsAdmin]
        return [permission() for permission in permission_classes]

    def get_queryset(self):
        """Filter queryset based on user permissions"""
        queryset = User.objects.all()

        # Non-admin users can only see themselves
        if not self.request.user.has_role('ADMIN'):
            queryset = queryset.filter(id=self.request.user.id)

        return queryset

    @action(detail=False, methods=['get'], permission_classes=[IsAuthenticated])
    def me(self, request):
        """Get current user profile"""
        serializer = UserProfileSerializer(request.user)
        return Response(serializer.data)

    @action(detail=False, methods=['put', 'patch'], permission_classes=[IsAuthenticated])
    def update_profile(self, request):
        """Update current user profile"""
        serializer = UserUpdateSerializer(request.user, data=request.data, partial=True)
        if serializer.is_valid():
            serializer.save()
            return Response(UserProfileSerializer(request.user).data)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

    @action(detail=False, methods=['post'], permission_classes=[IsAuthenticated])
    def change_password(self, request):
        """Change current user password"""
        serializer = ChangePasswordSerializer(data=request.data, context={'request': request})
        if serializer.is_valid():
            request.user.set_password(serializer.validated_data['new_password'])
            request.user.save()
            return Response({'message': 'Password changed successfully.'})
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

    @action(detail=True, methods=['post'], permission_classes=[IsAuthenticated, CanManageUsers])
    def deactivate(self, request, pk=None):
        """Deactivate a user account"""
        user = self.get_object()
        if user == request.user:
            return Response(
                {'error': 'Cannot deactivate your own account.'},
                status=status.HTTP_400_BAD_REQUEST
            )

        user.is_active = False
        user.save()
        return Response({'message': 'User deactivated successfully.'})

    @action(detail=True, methods=['post'], permission_classes=[IsAuthenticated, CanManageUsers])
    def activate(self, request, pk=None):
        """Activate a user account"""
        user = self.get_object()
        user.is_active = True
        user.save()
        return Response({'message': 'User activated successfully.'})


class RoleViewSet(viewsets.ReadOnlyModelViewSet):
    """
    Read-only ViewSet for Role management.
    """
    queryset = Role.objects.all()
    serializer_class = RoleSerializer
    permission_classes = [IsAuthenticated]
    filter_backends = [SearchFilter, OrderingFilter]
    search_fields = ['name', 'description']
    ordering_fields = ['name', 'created_at']
    ordering = ['name']


class UserRoleViewSet(viewsets.ModelViewSet):
    """
    ViewSet for User-Role relationship management.
    """
    queryset = UserRole.objects.all()
    serializer_class = UserRoleSerializer
    permission_classes = [IsAuthenticated, CanAssignRoles]
    filter_backends = [DjangoFilterBackend, OrderingFilter]
    filterset_fields = ['user', 'role']
    ordering_fields = ['assigned_at']
    ordering = ['-assigned_at']

    def get_queryset(self):
        """Filter queryset based on user permissions"""
        queryset = UserRole.objects.select_related('user', 'role', 'assigned_by')

        # Non-admin users can only see their own roles
        if not self.request.user.has_role('ADMIN'):
            queryset = queryset.filter(user=self.request.user)

        return queryset

    def perform_create(self, serializer):
        """Assign role with current user as assigner"""
        serializer.save(assigned_by=self.request.user)

    @action(detail=False, methods=['post'], permission_classes=[IsAuthenticated, CanAssignRoles])
    def assign_role(self, request):
        """Assign a role to a user"""
        serializer = UserRoleAssignmentSerializer(data=request.data)
        if serializer.is_valid():
            user = User.objects.get(id=serializer.validated_data['user_id'])
            role = Role.objects.get(name=serializer.validated_data['role_name'])

            # Check if assignment already exists
            if user.user_roles.filter(role=role).exists():
                return Response(
                    {'error': 'User already has this role.'},
                    status=status.HTTP_400_BAD_REQUEST
                )

            # Create the assignment
            user_role = UserRole.objects.create(
                user=user,
                role=role,
                assigned_by=request.user
            )

            response_serializer = UserRoleSerializer(user_role)
            return Response(response_serializer.data, status=status.HTTP_201_CREATED)

        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

    @action(detail=True, methods=['delete'], permission_classes=[IsAuthenticated, CanAssignRoles])
    def revoke_role(self, request, pk=None):
        """Revoke a role from a user"""
        user_role = self.get_object()

        # Prevent revoking admin role from oneself
        if (user_role.user == request.user and
            user_role.role.name == 'ADMIN' and
            not request.user.user_roles.filter(role__name='ADMIN').exclude(id=user_role.id).exists()):
            return Response(
                {'error': 'Cannot revoke your own admin role.'},
                status=status.HTTP_400_BAD_REQUEST
            )

        user_role.delete()
        return Response({'message': 'Role revoked successfully.'})
