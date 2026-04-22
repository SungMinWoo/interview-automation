import logging

from django.conf import settings
from django.contrib.auth import authenticate, get_user_model
from django.contrib.auth.models import update_last_login
from django.db import transaction
from rest_framework import generics, permissions, status
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework_simplejwt.tokens import RefreshToken

from .serializers import LoginResponseSerializer, RegisterSerializer, UserProfileSerializer

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
            return Response(
                {'detail': '이메일 또는 비밀번호가 올바르지 않습니다.'},
                status=status.HTTP_401_UNAUTHORIZED,
            )

        return Response(_build_login_response(user))


class RegisterView(generics.CreateAPIView):
    """Create a new user account."""

    queryset = User.objects.all()
    permission_classes = [permissions.AllowAny]
    serializer_class = RegisterSerializer

    def create(self, request, *args, **kwargs):
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        user = serializer.save()
        return Response(
            _build_login_response(user),
            status=status.HTTP_201_CREATED,
        )


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

        update_last_login(None, user)
        return Response(_build_login_response(user))
