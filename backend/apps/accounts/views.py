"""
SIA HMS — Accounts Views
Auth endpoints: login, refresh, logout, profile CRUD, change password, user management.
"""

from rest_framework import status, generics
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated, AllowAny
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework_simplejwt.views import TokenObtainPairView, TokenRefreshView
from rest_framework_simplejwt.tokens import RefreshToken
from rest_framework_simplejwt.exceptions import TokenError, InvalidToken

from .models import User
from .serializers import (
    CustomTokenObtainPairSerializer,
    UserProfileSerializer,
    UserUpdateSerializer,
    ChangePasswordSerializer,
    UserCreateSerializer,
)
from .permissions import IsPropertyManager, IsSuperAdmin


class LoginView(TokenObtainPairView):
    """
    POST /api/auth/login/
    Returns access token (15 min) + refresh token (7 days) + user profile.
    """

    serializer_class = CustomTokenObtainPairSerializer
    permission_classes = [AllowAny]

    def post(self, request, *args, **kwargs):
        serializer = self.get_serializer(data=request.data)
        try:
            serializer.is_valid(raise_exception=True)
        except TokenError as e:
            raise InvalidToken(e.args[0])

        return Response(serializer.validated_data, status=status.HTTP_200_OK)


class RefreshTokenView(TokenRefreshView):
    """
    POST /api/auth/refresh/
    Accepts refresh token, returns new access + rotated refresh token.
    Blocks refresh for impersonated sessions containing 'tenant_schema' claim.
    """
    def post(self, request, *args, **kwargs):
        refresh_token = request.data.get("refresh")
        if refresh_token:
            try:
                token = RefreshToken(refresh_token)
                if token.get("tenant_schema"):
                    return Response(
                        {"error": "Token refresh is disabled for impersonated sessions.", "code": "IMPERSONATION_REFRESH_BLOCKED"},
                        status=status.HTTP_403_FORBIDDEN
                    )
            except TokenError:
                pass
        return super().post(request, *args, **kwargs)


class LogoutView(APIView):
    """
    POST /api/auth/logout/
    Blacklists the refresh token. Client must delete access token.
    """

    permission_classes = [IsAuthenticated]

    def post(self, request):
        try:
            refresh_token = request.data.get("refresh")
            if not refresh_token:
                return Response(
                    {"error": "Refresh token is required.", "code": "MISSING_TOKEN", "detail": {}},
                    status=status.HTTP_400_BAD_REQUEST,
                )
            token = RefreshToken(refresh_token)
            token.blacklist()
            return Response(
                {"message": "Successfully logged out."},
                status=status.HTTP_200_OK,
            )
        except Exception:
            return Response(
                {"error": "Invalid or expired token.", "code": "INVALID_TOKEN", "detail": {}},
                status=status.HTTP_400_BAD_REQUEST,
            )


class MeView(generics.RetrieveUpdateAPIView):
    """
    GET  /api/auth/me/  → Current user profile
    PUT  /api/auth/me/  → Update profile (name, phone, avatar)
    """

    permission_classes = [IsAuthenticated]

    def get_serializer_class(self):
        if self.request.method in ("PUT", "PATCH"):
            return UserUpdateSerializer
        return UserProfileSerializer

    def get_object(self):
        return self.request.user

    def update(self, request, *args, **kwargs):
        kwargs["partial"] = True
        return super().update(request, *args, **kwargs)


class ChangePasswordView(APIView):
    """
    POST /api/auth/change-password/
    Requires: old_password, new_password, confirm_password
    """

    permission_classes = [IsAuthenticated]

    def post(self, request):
        serializer = ChangePasswordSerializer(
            data=request.data,
            context={"request": request},
        )
        serializer.is_valid(raise_exception=True)
        serializer.save()
        return Response(
            {"message": "Password changed successfully."},
            status=status.HTTP_200_OK,
        )


class UserListCreateView(generics.ListCreateAPIView):
    """
    GET  /api/auth/users/  → List all staff users (Property Manager+)
    POST /api/auth/users/  → Create new staff user (Property Manager+)
    """

    permission_classes = [IsAuthenticated, IsPropertyManager]
    queryset = User.objects.all().order_by("-date_joined")

    def get_serializer_class(self):
        if self.request.method == "POST":
            return UserCreateSerializer
        return UserProfileSerializer


class UserDetailView(generics.RetrieveUpdateDestroyAPIView):
    """
    GET    /api/auth/users/{id}/  → Get staff user
    PUT    /api/auth/users/{id}/  → Update staff user (Property Manager+)
    DELETE /api/auth/users/{id}/  → Deactivate staff user (Property Manager+)
    """

    permission_classes = [IsAuthenticated, IsPropertyManager]
    queryset = User.objects.all()
    serializer_class = UserProfileSerializer

    def destroy(self, request, *args, **kwargs):
        """Soft delete: deactivate instead of deleting."""
        user = self.get_object()
        user.is_active = False
        user.save()
        return Response(
            {"message": f"User {user.email} deactivated."},
            status=status.HTTP_200_OK,
        )
