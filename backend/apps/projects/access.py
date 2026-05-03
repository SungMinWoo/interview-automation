from django.shortcuts import get_object_or_404
from rest_framework.exceptions import PermissionDenied

from .models import Project, ProjectMember


def get_accessible_project(request_or_user, project_id):
    """멤버십 확인 후 프로젝트 반환. 멤버가 아니면 403.

    첫 번째 인자는 request 또는 user 모두 허용 (기존 get_user_project 호환).
    """
    user = getattr(request_or_user, 'user', request_or_user)
    project = get_object_or_404(Project, pk=project_id)
    if not ProjectMember.objects.filter(project=project, user=user).exists():
        raise PermissionDenied('이 프로젝트에 대한 접근 권한이 없습니다.')
    return project


def get_member_role(user, project):
    """유저의 프로젝트 내 역할 반환. 멤버가 아니면 None."""
    membership = ProjectMember.objects.filter(project=project, user=user).first()
    return membership.role if membership else None
