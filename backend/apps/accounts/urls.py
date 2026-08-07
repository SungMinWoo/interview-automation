from django.urls import path
from rest_framework.routers import DefaultRouter
from rest_framework_simplejwt.views import TokenRefreshView

from . import views

app_name = 'accounts'

router = DefaultRouter()
router.register(r'users/manage', views.AdminUserManageViewSet, basename='manage-user')

urlpatterns = [
    # 인증은 SSO 전용 — 일반 이메일/비밀번호 로그인과 외부 회원가입 모두 제거됨.
    # 사용자는 SSO 최초 로그인 시 자동 생성되거나, 사이트 관리자(`AdminUserManageViewSet`)가 추가.
    path('logout/', views.LogoutView.as_view(), name='logout'),
    path('token/refresh/', TokenRefreshView.as_view(), name='token-refresh'),
    path('me/', views.MeView.as_view(), name='me'),
    path('users/search/', views.UserSearchView.as_view(), name='user-search'),
    path('sso/token/', views.SSOTokenExchangeView.as_view(), name='sso-token'),
] + router.urls
