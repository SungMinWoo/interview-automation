from rest_framework import viewsets, permissions, status
from rest_framework.response import Response
from django.shortcuts import get_object_or_404

import os

from .models import Project, ProjectMember, ReferenceSite, ProjectDepartment, ProjectPosition, ProjectFile, ProjectActivity
from apps.accounts.permissions import IsProjectEditorOrReadOnly, IsProjectEditor
from .serializers import (
    ProjectListSerializer,
    ProjectDetailSerializer,
    ProjectCreateSerializer,
    ProjectUpdateSerializer,
    ReferenceSiteSerializer,
    ProjectDepartmentSerializer,
    ProjectPositionSerializer,
    ProjectFileSerializer,
    ProjectActivitySerializer,
    ProjectMemberSerializer,
    AddMemberSerializer,
    UpdateMemberRoleSerializer,
    TransferOwnershipSerializer,
)


class ProjectViewSet(viewsets.ModelViewSet):
    permission_classes = [permissions.IsAuthenticated]
    pagination_class = None

    def get_permissions(self):
        from apps.accounts.permissions import IsProjectAdmin, IsProjectMember, IsProjectOwner
        if self.action == 'destroy':
            return [permissions.IsAuthenticated(), IsProjectOwner()]
        if self.action in ('update', 'partial_update'):
            return [permissions.IsAuthenticated(), IsProjectAdmin()]
        if self.action == 'retrieve':
            return [permissions.IsAuthenticated(), IsProjectMember()]
        return [permissions.IsAuthenticated()]

    def get_queryset(self):
        from django.db.models import Prefetch
        from .access import is_site_admin
        members_prefetch = Prefetch(
            'members',
            queryset=ProjectMember.objects.select_related('user'),
        )
        if is_site_admin(self.request.user):
            qs = Project.objects.all()
        else:
            qs = Project.objects.filter(members__user=self.request.user).distinct()
        if self.action == 'list':
            qs = qs.select_related('owner').prefetch_related(members_prefetch)
        return qs

    def get_serializer_class(self):
        if self.action == 'list':
            return ProjectListSerializer
        if self.action == 'create':
            return ProjectCreateSerializer
        if self.action in ('update', 'partial_update'):
            return ProjectUpdateSerializer
        return ProjectDetailSerializer

    def perform_create(self, serializer):
        project = serializer.save(owner=self.request.user)
        ProjectMember.objects.create(
            project=project,
            user=self.request.user,
            role=ProjectMember.Role.OWNER,
        )
        from .models import log_activity
        log_activity(project, self.request.user, 'project_created', {'title': project.title, 'client_name': project.client_name})


class ReferenceSiteViewSet(viewsets.ModelViewSet):
    serializer_class = ReferenceSiteSerializer
    permission_classes = [permissions.IsAuthenticated, IsProjectEditorOrReadOnly]

    def get_project(self):
        from .access import get_accessible_project
        return get_accessible_project(self.request, self.kwargs['project_id'])

    def get_queryset(self):
        return ReferenceSite.objects.filter(
            project__pk=self.kwargs['project_id'],
        )

    def perform_create(self, serializer):
        project = self.get_project()
        instance = serializer.save(project=project)
        from .models import log_activity
        log_activity(project, self.request.user, 'reference_site_added', {
            'url': instance.url,
            'title': instance.title or instance.url,
        })

    def perform_destroy(self, instance):
        from .models import log_activity
        project = instance.project
        title = instance.title or instance.url
        instance.delete()
        log_activity(project, self.request.user, 'reference_site_removed', {'title': title})


class ProjectDepartmentViewSet(viewsets.ModelViewSet):
    serializer_class = ProjectDepartmentSerializer
    permission_classes = [permissions.IsAuthenticated, IsProjectEditorOrReadOnly]

    def get_project(self):
        from .access import get_accessible_project
        return get_accessible_project(self.request, self.kwargs['project_id'])

    def get_queryset(self):
        return ProjectDepartment.objects.filter(
            project__pk=self.kwargs['project_id'],
        )

    def perform_create(self, serializer):
        project = self.get_project()
        instance = serializer.save(project=project)
        from .models import log_activity
        log_activity(project, self.request.user, 'department_added', {'name': instance.name})

    def perform_destroy(self, instance):
        from .models import log_activity
        project = instance.project
        name = instance.name
        instance.delete()
        log_activity(project, self.request.user, 'department_removed', {'name': name})


class ProjectPositionViewSet(viewsets.ModelViewSet):
    serializer_class = ProjectPositionSerializer
    permission_classes = [permissions.IsAuthenticated, IsProjectEditorOrReadOnly]

    def get_project(self):
        from .access import get_accessible_project
        return get_accessible_project(self.request, self.kwargs['project_id'])

    def get_queryset(self):
        return ProjectPosition.objects.filter(
            project__pk=self.kwargs['project_id'],
        )

    def perform_create(self, serializer):
        project = self.get_project()
        instance = serializer.save(project=project)
        from .models import log_activity
        log_activity(project, self.request.user, 'position_added', {'name': instance.name})

    def perform_destroy(self, instance):
        from .models import log_activity
        project = instance.project
        name = instance.name
        instance.delete()
        log_activity(project, self.request.user, 'position_removed', {'name': name})


class ProjectFileViewSet(viewsets.ModelViewSet):
    """Upload and manage project files."""
    serializer_class = ProjectFileSerializer
    permission_classes = [permissions.IsAuthenticated, IsProjectEditorOrReadOnly]

    def get_project(self):
        from .access import get_accessible_project
        return get_accessible_project(self.request, self.kwargs['project_id'])

    def get_queryset(self):
        return ProjectFile.objects.filter(
            project__pk=self.kwargs['project_id'],
        )

    def perform_create(self, serializer):
        project = self.get_project()
        uploaded_file = self.request.FILES.get('file')
        if not uploaded_file:
            from rest_framework.exceptions import ValidationError
            raise ValidationError({'file': 'No file uploaded.'})

        ext = os.path.splitext(uploaded_file.name)[1].lower()
        instance = serializer.save(
            project=project,
            original_name=uploaded_file.name,
            file_type=ext,
            file_size=uploaded_file.size,
        )

        # Extract text from file
        from services.file_extractor import extract_text_from_file
        extracted = extract_text_from_file(instance.file.path, ext)
        if extracted:
            instance.extracted_text = extracted
            instance.save(update_fields=['extracted_text'])

        from .models import log_activity
        log_activity(project, self.request.user, 'file_uploaded', {
            'file_name': uploaded_file.name,
            'file_type': ext,
        })

    def perform_destroy(self, instance):
        from .models import log_activity
        file_name = instance.original_name
        project = instance.project
        instance.delete()
        log_activity(project, self.request.user, 'file_deleted', {'file_name': file_name})


from rest_framework.decorators import api_view, permission_classes as perm_classes
from rest_framework.parsers import MultiPartParser, FormParser


class FileAnalyzeView(viewsets.ViewSet):
    """POST /{file_id}/analyze/ - Analyze a file with AI."""
    permission_classes = [permissions.IsAuthenticated, IsProjectEditor]

    def create(self, request, project_id, pk=None):
        from services.ai_client import get_ai_client, validate_ai_provider
        from .access import get_accessible_project

        project = get_accessible_project(request, project_id)
        project_file = get_object_or_404(ProjectFile, pk=pk, project=project)

        if not project_file.extracted_text:
            return Response(
                {'detail': '파일에서 텍스트를 추출할 수 없습니다.'},
                status=status.HTTP_400_BAD_REQUEST,
            )

        ai_provider = validate_ai_provider(request.data.get('ai_provider'))
        ai_client = get_ai_client(ai_provider)

        try:
            result = ai_client.analyze_file_content(
                file_text=project_file.extracted_text,
                file_name=project_file.original_name,
            )
        except Exception as e:
            return Response({'detail': f'AI 분석 실패: {str(e)}'}, status=status.HTTP_502_BAD_GATEWAY)

        project_file.ai_summary = result.get('summary', '')
        project_file.save(update_fields=['ai_summary'])

        from .models import log_activity
        log_activity(project, request.user, 'file_analyzed', {
            'file_name': project_file.original_name,
            'ai_provider': ai_provider,
        })

        return Response({
            'file_id': project_file.id,
            'ai_summary': result.get('summary', ''),
            'analysis': result,
        })


class ProjectActivityListView(viewsets.ViewSet):
    """GET - List activity history for a project."""
    permission_classes = [permissions.IsAuthenticated]

    def list(self, request, project_id):
        from .access import get_accessible_project
        project = get_accessible_project(request, project_id)
        activities = ProjectActivity.objects.filter(project=project)[:50]
        return Response(ProjectActivitySerializer(activities, many=True).data)


# ── 멤버 관리 ──

class ProjectMemberViewSet(viewsets.ViewSet):
    """프로젝트 멤버 CRUD."""
    permission_classes = [permissions.IsAuthenticated]

    def _get_project(self, project_id):
        return get_object_or_404(Project, pk=project_id)  # 멤버 확인은 아래에서 별도 수행

    def _get_membership(self, project, user):
        return ProjectMember.objects.filter(project=project, user=user).first()

    def _require_admin(self, project, user):
        from .access import is_site_admin
        membership = self._get_membership(project, user)
        if is_site_admin(user):
            return membership  # 사이트 관리자는 멤버 아니어도 통과
        if not membership or membership.role not in ('owner', 'admin'):
            from rest_framework.exceptions import PermissionDenied
            raise PermissionDenied('관리자 이상 권한이 필요합니다.')
        return membership

    def list(self, request, project_id):
        """GET - 멤버 목록 (멤버 또는 사이트 관리자)."""
        from .access import is_site_admin
        project = self._get_project(project_id)
        membership = self._get_membership(project, request.user)
        if not membership and not is_site_admin(request.user):
            return Response({'detail': '접근 권한이 없습니다.'}, status=status.HTTP_403_FORBIDDEN)
        members = ProjectMember.objects.filter(project=project).select_related('user')
        return Response(ProjectMemberSerializer(members, many=True).data)

    def create(self, request, project_id):
        """POST - 멤버 추가 (admin+ 권한)."""
        project = self._get_project(project_id)
        self._require_admin(project, request.user)

        serializer = AddMemberSerializer(data=request.data, context={'project': project})
        serializer.is_valid(raise_exception=True)

        member = ProjectMember.objects.create(
            project=project,
            user=serializer._target_user,
            role=serializer.validated_data['role'],
            invited_by=request.user,
        )

        from .models import log_activity
        log_activity(project, request.user, 'member_added', {
            'member_email': member.user_email,
            'member_name': member.user_name or member.user_email,
            'role': member.role,
            'role_label': ProjectMember.Role(member.role).label,
        })

        from apps.notifications.tasks import create_project_notifications
        create_project_notifications.delay(
            project_id=project.id,
            event_type='member_added',
            title=f'{project.title} — {member.user_name or member.user_email}님이 멤버로 추가되었습니다',
            exclude_user_id=request.user.id,
            actor_id=request.user.id,
        )

        return Response(ProjectMemberSerializer(member).data, status=status.HTTP_201_CREATED)

    def partial_update(self, request, project_id, pk=None):
        """PATCH - 멤버 역할 변경 (admin+ 권한)."""
        project = self._get_project(project_id)
        my_membership = self._require_admin(project, request.user)
        target = get_object_or_404(ProjectMember, pk=pk, project=project)

        if target.role == ProjectMember.Role.OWNER:
            return Response({'detail': '소유자 역할은 변경할 수 없습니다. 소유권 이전을 사용하세요.'},
                            status=status.HTTP_400_BAD_REQUEST)

        serializer = UpdateMemberRoleSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        old_role = target.role
        target.role = serializer.validated_data['role']
        target.save(update_fields=['role', 'updated_at'])

        from .models import log_activity
        log_activity(project, request.user, 'member_role_changed', {
            'member_email': target.user_email,
            'member_name': target.user_name or target.user_email,
            'old_role': old_role,
            'old_role_label': ProjectMember.Role(old_role).label,
            'new_role': target.role,
            'new_role_label': ProjectMember.Role(target.role).label,
        })

        from apps.notifications.tasks import create_project_notifications
        create_project_notifications.delay(
            project_id=project.id,
            event_type='member_role_changed',
            title=f'{project.title} — {target.user_name or target.user_email}님의 역할이 변경되었습니다',
            exclude_user_id=request.user.id,
            actor_id=request.user.id,
        )

        return Response(ProjectMemberSerializer(target).data)

    def destroy(self, request, project_id, pk=None):
        """DELETE - 멤버 제거 (admin+ 권한, owner는 제거 불가)."""
        project = self._get_project(project_id)
        self._require_admin(project, request.user)
        target = get_object_or_404(ProjectMember, pk=pk, project=project)

        if target.role == ProjectMember.Role.OWNER:
            return Response({'detail': '소유자는 제거할 수 없습니다.'}, status=status.HTTP_400_BAD_REQUEST)

        member_email = target.user_email
        member_name = target.user_name or target.user_email
        target.delete()

        from .models import log_activity
        log_activity(project, request.user, 'member_removed', {
            'member_email': member_email,
            'member_name': member_name,
        })

        from apps.notifications.tasks import create_project_notifications
        create_project_notifications.delay(
            project_id=project.id,
            event_type='member_removed',
            title=f'{project.title} — {member_name}님이 프로젝트에서 제거되었습니다',
            exclude_user_id=request.user.id,
            actor_id=request.user.id,
        )

        return Response(status=status.HTTP_204_NO_CONTENT)


class TransferOwnershipView(viewsets.ViewSet):
    """POST - 소유권 이전 (owner만 가능)."""
    permission_classes = [permissions.IsAuthenticated]

    def create(self, request, project_id):
        from .access import get_accessible_project, is_site_admin
        project = get_accessible_project(request, project_id)
        my_membership = ProjectMember.objects.filter(
            project=project, user=request.user, role=ProjectMember.Role.OWNER
        ).first()
        if not my_membership and not is_site_admin(request.user):
            from rest_framework.exceptions import PermissionDenied
            raise PermissionDenied('소유자만 소유권을 이전할 수 있습니다.')

        serializer = TransferOwnershipSerializer(data=request.data, context={'project': project})
        serializer.is_valid(raise_exception=True)

        new_owner_id = serializer.validated_data['new_owner_id']
        new_owner_membership = ProjectMember.objects.get(project=project, user_id=new_owner_id)

        # 기존 소유자 강등 (사이트 관리자가 이전하는 경우 my_membership이 None일 수 있음)
        current_owner_membership = my_membership or ProjectMember.objects.filter(
            project=project, role=ProjectMember.Role.OWNER
        ).exclude(pk=new_owner_membership.pk).first()
        if current_owner_membership:
            current_owner_membership.role = ProjectMember.Role.ADMIN
            current_owner_membership.save(update_fields=['role', 'updated_at'])

        new_owner_membership.role = ProjectMember.Role.OWNER
        new_owner_membership.save(update_fields=['role', 'updated_at'])

        # Project.owner FK 업데이트
        project.owner = new_owner_membership.user
        project.save(update_fields=['owner', 'updated_at'])

        from .models import log_activity
        log_activity(project, request.user, 'ownership_transferred', {
            'from_email': request.user.email,
            'from_name': getattr(request.user, 'first_name', '') or getattr(request.user, 'username', '') or request.user.email,
            'to_email': new_owner_membership.user_email,
            'to_name': new_owner_membership.user_name or new_owner_membership.user_email,
        })

        from apps.notifications.tasks import create_project_notifications
        create_project_notifications.delay(
            project_id=project.id,
            event_type='ownership_transferred',
            title=f'{project.title} — 소유권이 {new_owner_membership.user_name or new_owner_membership.user_email}님에게 이전되었습니다',
            actor_id=request.user.id,
        )

        return Response({'detail': '소유권이 이전되었습니다.'})
