from rest_framework.permissions import BasePermission


class IsOwner(BasePermission):
    """
    Object-level permission that only allows the owner of an object to access it.

    Expects the model instance to have an attribute named `user` or `owner`
    that points to the owning User.
    """

    def has_object_permission(self, request, view, obj):
        if request.user.is_superuser or request.user.is_staff:
            return True
        # Check common owner attribute names
        if hasattr(obj, 'user'):
            return obj.user == request.user
        if hasattr(obj, 'owner'):
            return obj.owner == request.user
        return False


# ── 역할 기반 프로젝트 퍼미션 ──

class _ProjectRolePermission(BasePermission):
    """프로젝트 멤버십 역할 기반 권한 베이스 클래스."""
    allowed_roles: list[str] = []

    def _get_project_id(self, view):
        return view.kwargs.get('project_id') or view.kwargs.get('pk')

    def has_permission(self, request, view):
        if not request.user or not request.user.is_authenticated:
            return False
        # 사이트 관리자(is_superuser/is_staff)는 모든 프로젝트 권한 우회
        if request.user.is_superuser or request.user.is_staff:
            return True
        project_id = self._get_project_id(view)
        if not project_id:
            return True  # list view — get_queryset에서 필터
        from apps.projects.models import ProjectMember
        return ProjectMember.objects.filter(
            project_id=project_id,
            user=request.user,
            role__in=self.allowed_roles,
        ).exists()


class IsProjectMember(_ProjectRolePermission):
    """모든 프로젝트 멤버 (viewer 포함)."""
    allowed_roles = ['owner', 'admin', 'editor', 'viewer']


class IsProjectEditor(_ProjectRolePermission):
    """편집자 이상 (editor, admin, owner)."""
    allowed_roles = ['owner', 'admin', 'editor']


class IsProjectAdmin(_ProjectRolePermission):
    """관리자 이상 (admin, owner)."""
    allowed_roles = ['owner', 'admin']


class IsProjectOwner(_ProjectRolePermission):
    """소유자만."""
    allowed_roles = ['owner']
