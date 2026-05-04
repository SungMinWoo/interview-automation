from django.shortcuts import get_object_or_404
from rest_framework.exceptions import PermissionDenied

from .models import Project, ProjectMember


def is_site_admin(user):
    """is_superuser/is_staff 유저는 모든 프로젝트에 admin 권한으로 접근."""
    return bool(user and user.is_authenticated and (user.is_superuser or user.is_staff))


def get_accessible_project(request_or_user, project_id):
    """멤버십 또는 사이트 관리자(is_superuser/is_staff)만 접근. 아니면 403."""
    user = getattr(request_or_user, 'user', request_or_user)
    project = get_object_or_404(Project, pk=project_id)
    if is_site_admin(user):
        return project
    if not ProjectMember.objects.filter(project=project, user=user).exists():
        raise PermissionDenied('이 프로젝트에 대한 접근 권한이 없습니다.')
    return project


def get_member_role(user, project):
    """유저의 프로젝트 내 역할 반환. 사이트 관리자면 'admin', 멤버 아니면 None."""
    if is_site_admin(user):
        membership = ProjectMember.objects.filter(project=project, user=user).first()
        return membership.role if membership else 'admin'
    membership = ProjectMember.objects.filter(project=project, user=user).first()
    return membership.role if membership else None
