from django.urls import path
from rest_framework.routers import DefaultRouter
from rest_framework_simplejwt.views import TokenRefreshView

from . import views

app_name = 'accounts'

router = DefaultRouter()
router.register(r'users/manage', views.AdminUserManageViewSet, basename='manage-user')

urlpatterns = [
    # 외부 회원가입 차단 — 사용자는 사이트 관리자(`AdminUserManageViewSet`) 또는 SSO로만 추가됨.
    path('login/', views.LoginView.as_view(), name='login'),
    path('logout/', views.LogoutView.as_view(), name='logout'),
    path('token/refresh/', TokenRefreshView.as_view(), name='token-refresh'),
    path('me/', views.MeView.as_view(), name='me'),
    path('users/search/', views.UserSearchView.as_view(), name='user-search'),
    path('sso/token/', views.SSOTokenExchangeView.as_view(), name='sso-token'),
] + router.urls
