import logging

from django.conf import settings
from django.contrib.auth import authenticate, get_user_model
from django.contrib.auth.models import update_last_login
from django.db import transaction
from rest_framework import generics, permissions, status
from rest_framework.response import Response
from rest_framework.throttling import ScopedRateThrottle
from rest_framework.views import APIView
from rest_framework_simplejwt.tokens import RefreshToken

from .serializers import (
    AdminUserSerializer,
    LoginResponseSerializer,
    UserProfileSerializer,
    UserSearchSerializer,
)

logger = logging.getLogger(__name__)

User = get_user_model()


def _build_login_response(user):
    """Build a consistent login response with tokens + user info."""
    refresh = RefreshToken.for_user(user)
    return {
        'tokens': {
            'access': str(refresh.access_token),
            'refresh': str(refresh),
        },
        'user': LoginResponseSerializer(user).data,
    }


class LoginView(APIView):
    """Authenticate and return JWT tokens with user info."""

    permission_classes = [permissions.AllowAny]
    throttle_classes = [ScopedRateThrottle]
    throttle_scope = 'login'

    def post(self, request):
        email = request.data.get('email')
        password = request.data.get('password')

        if not email or not password:
            return Response(
                {'detail': '이메일과 비밀번호를 입력해주세요.'},
                status=status.HTTP_400_BAD_REQUEST,
            )

        user = authenticate(request, username=email, password=password)
        if user is None:
            # ModelBackend는 비활성 유저도 None 반환 — 사유를 분리해서 안내
            existing = User.objects.filter(email=email).first()
            if existing and not existing.is_active and existing.check_password(password):
                return Response(
                    {'detail': '비활성화된 계정입니다. 관리자에게 문의해주세요.'},
                    status=status.HTTP_403_FORBIDDEN,
                )
            return Response(
                {'detail': '이메일 또는 비밀번호가 올바르지 않습니다.'},
                status=status.HTTP_401_UNAUTHORIZED,
            )

        if not user.is_active:
            return Response(
                {'detail': '비활성화된 계정입니다. 관리자에게 문의해주세요.'},
                status=status.HTTP_403_FORBIDDEN,
            )

        return Response(_build_login_response(user))


class LogoutView(APIView):
    """Blacklist the refresh token to log the user out."""

    permission_classes = [permissions.IsAuthenticated]

    def post(self, request):
        try:
            refresh_token = request.data['refresh']
            token = RefreshToken(refresh_token)
            token.blacklist()
            return Response(status=status.HTTP_205_RESET_CONTENT)
        except KeyError:
            return Response(
                {'detail': 'Refresh token is required.'},
                status=status.HTTP_400_BAD_REQUEST,
            )
        except Exception:
            return Response(
                {'detail': 'Invalid or expired token.'},
                status=status.HTTP_400_BAD_REQUEST,
            )


class MeView(generics.RetrieveUpdateAPIView):
    """Retrieve or update the authenticated user's profile."""

    permission_classes = [permissions.IsAuthenticated]
    serializer_class = UserProfileSerializer

    def get_object(self):
        return self.request.user


class UserSearchView(APIView):
    """GET /auth/users/search/?q=keyword — 유저 검색 (이메일, 이름, username)."""
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        q = request.query_params.get('q', '').strip()
        if not q:
            return Response([])

        from django.db.models import Q
        users = User.objects.filter(
            Q(email__icontains=q) | Q(username__icontains=q)
            | Q(first_name__icontains=q) | Q(company_name__icontains=q),
            is_active=True,
        ).exclude(id=request.user.id)[:10]

        return Response(UserSearchSerializer(users, many=True).data)


class SSOTokenExchangeView(APIView):
    """Exchange SSO authorization code for JWT tokens."""

    permission_classes = [permissions.AllowAny]

    @transaction.atomic
    def post(self, request):
        code = request.data.get('code')
        code_verifier = request.data.get('code_verifier')

        if not code:
            return Response({'detail': 'Authorization code가 필요합니다.'}, status=status.HTTP_400_BAD_REQUEST)
        if not code_verifier:
            return Response({'detail': 'PKCE code_verifier가 필요합니다.'}, status=status.HTTP_400_BAD_REQUEST)

        # SSO 설정 체크
        if not getattr(settings, 'OAUTH2_CLIENT_ID', None):
            return Response({'detail': 'SSO가 설정되지 않았습니다.'}, status=status.HTTP_503_SERVICE_UNAVAILABLE)

        try:
            from services.sso import exchange_code_for_token
            token_response = exchange_code_for_token(code, code_verifier)
            userinfo = token_response.get('user_info')
        except Exception as e:
            logger.error(f'SSO token exchange failed: {e}')
            return Response({'detail': str(e)}, status=status.HTTP_400_BAD_REQUEST)

        if not userinfo or not userinfo.get('email'):
            return Response({'detail': 'SSO에서 사용자 정보를 가져올 수 없습니다.'}, status=status.HTTP_400_BAD_REQUEST)

        email = userinfo['email']
        sso_id = str(userinfo.get('id', ''))

        # 유저 조회 또는 생성
        user = User.objects.filter(email=email).first()
        if not user and sso_id:
            user = User.objects.filter(sso_id=sso_id).first()

        if not user:
            username = email.split('@')[0]
            # username 중복 방지
            base_username = username
            counter = 1
            while User.objects.filter(username=username).exists():
                username = f'{base_username}{counter}'
                counter += 1

            user = User.objects.create(
                email=email,
                username=username,
                first_name=userinfo.get('name', ''),
                company_name=userinfo.get('team', ''),
                sso_id=sso_id or None,
                is_active=True,
            )
            user.set_unusable_password()
            user.save()
            logger.info(f'SSO: Created new user {email}')
        else:
            # 기존 유저 정보 업데이트
            updated = False
            if sso_id and user.sso_id != sso_id:
                user.sso_id = sso_id
                updated = True
            if userinfo.get('name') and user.first_name != userinfo['name']:
                user.first_name = userinfo['name']
                updated = True
            if userinfo.get('team') and user.company_name != userinfo['team']:
                user.company_name = userinfo['team']
                updated = True
            if updated:
                user.save()

        if not user.is_active:
            return Response(
                {'detail': '비활성화된 계정입니다. 관리자에게 문의해주세요.'},
                status=status.HTTP_403_FORBIDDEN,
            )

        update_last_login(None, user)
        return Response(_build_login_response(user))


class IsSiteAdmin(permissions.BasePermission):
    """is_superuser 또는 is_staff만 접근 허용."""
    message = '사이트 관리자만 접근할 수 있습니다.'

    def has_permission(self, request, view):
        u = request.user
        return bool(u and u.is_authenticated and (u.is_superuser or u.is_staff))


from rest_framework import viewsets, filters


class AdminUserManageViewSet(viewsets.ModelViewSet):
    """사이트 관리자 전용 — 유저 목록/조회/비활성화·권한 토글.

    규칙:
    - is_staff/is_superuser는 staff/superuser만 접근 가능
    - 다른 superuser는 본인이 아니면 어떤 변경도 불가
    - is_staff 변경은 superuser만 가능
    - is_superuser 권한 부여는 이 UI로 불가 (보안). 데모트는 가능하지만 본인 제외
    - 본인 superuser 계정의 is_active/is_staff 해제 불가
    """
    permission_classes = [IsSiteAdmin]
    serializer_class = AdminUserSerializer
    queryset = User.objects.all().order_by('-created_at')
    filter_backends = [filters.SearchFilter]
    search_fields = ['email', 'username', 'first_name']
    http_method_names = ['get', 'patch', 'head', 'options']

    def perform_update(self, serializer):
        from rest_framework.exceptions import PermissionDenied, ValidationError

        target = serializer.instance
        actor = self.request.user
        validated = serializer.validated_data

        new_is_active = validated.get('is_active', target.is_active)
        new_is_staff = validated.get('is_staff', target.is_staff)
        new_is_superuser = validated.get('is_superuser', target.is_superuser)

        is_self = target.id == actor.id

        # 1. 다른 superuser는 본인이 아니면 수정 불가
        if target.is_superuser and not is_self:
            raise PermissionDenied('다른 슈퍼유저 계정은 수정할 수 없습니다.')

        # 2. is_superuser 부여는 UI로 불가 (False → True 차단)
        if new_is_superuser and not target.is_superuser:
            raise ValidationError({'is_superuser': '슈퍼유저 권한은 이 UI로 부여할 수 없습니다.'})

        # 3. is_staff/is_superuser 변경은 superuser만 가능
        is_perm_change = (new_is_staff != target.is_staff) or (new_is_superuser != target.is_superuser)
        if is_perm_change and not actor.is_superuser:
            raise PermissionDenied('권한 변경은 슈퍼유저만 가능합니다.')

        # 4. 본인 superuser는 자기 강등/비활성화 불가
        if is_self and target.is_superuser:
            if not new_is_active:
                raise ValidationError({'is_active': '본인 슈퍼유저 계정은 비활성화할 수 없습니다.'})
            if not new_is_staff:
                raise ValidationError({'is_staff': '본인 슈퍼유저 계정의 staff 권한은 해제할 수 없습니다.'})

        serializer.save()
