from rest_framework import viewsets, permissions, status
from rest_framework.response import Response
from django.shortcuts import get_object_or_404

import os

from .models import Project, ReferenceSite, ProjectDepartment, ProjectPosition, ProjectFile
from .serializers import (
    ProjectListSerializer,
    ProjectDetailSerializer,
    ProjectCreateSerializer,
    ProjectUpdateSerializer,
    ReferenceSiteSerializer,
    ProjectDepartmentSerializer,
    ProjectPositionSerializer,
    ProjectFileSerializer,
)


class ProjectViewSet(viewsets.ModelViewSet):
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        return Project.objects.filter(owner=self.request.user)

    def get_serializer_class(self):
        if self.action == 'list':
            return ProjectListSerializer
        if self.action == 'create':
            return ProjectCreateSerializer
        if self.action in ('update', 'partial_update'):
            return ProjectUpdateSerializer
        return ProjectDetailSerializer

    def perform_create(self, serializer):
        serializer.save(owner=self.request.user)


class ReferenceSiteViewSet(viewsets.ModelViewSet):
    serializer_class = ReferenceSiteSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_project(self):
        return get_object_or_404(
            Project, pk=self.kwargs['project_id'], owner=self.request.user,
        )

    def get_queryset(self):
        return ReferenceSite.objects.filter(
            project__pk=self.kwargs['project_id'],
            project__owner=self.request.user,
        )

    def perform_create(self, serializer):
        project = self.get_project()
        serializer.save(project=project)


class ProjectDepartmentViewSet(viewsets.ModelViewSet):
    serializer_class = ProjectDepartmentSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_project(self):
        return get_object_or_404(
            Project, pk=self.kwargs['project_id'], owner=self.request.user,
        )

    def get_queryset(self):
        return ProjectDepartment.objects.filter(
            project__pk=self.kwargs['project_id'],
            project__owner=self.request.user,
        )

    def perform_create(self, serializer):
        project = self.get_project()
        serializer.save(project=project)


class ProjectPositionViewSet(viewsets.ModelViewSet):
    serializer_class = ProjectPositionSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_project(self):
        return get_object_or_404(
            Project, pk=self.kwargs['project_id'], owner=self.request.user,
        )

    def get_queryset(self):
        return ProjectPosition.objects.filter(
            project__pk=self.kwargs['project_id'],
            project__owner=self.request.user,
        )

    def perform_create(self, serializer):
        project = self.get_project()
        serializer.save(project=project)


class ProjectFileViewSet(viewsets.ModelViewSet):
    """Upload and manage project files."""
    serializer_class = ProjectFileSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_project(self):
        return get_object_or_404(
            Project, pk=self.kwargs['project_id'], owner=self.request.user,
        )

    def get_queryset(self):
        return ProjectFile.objects.filter(
            project__pk=self.kwargs['project_id'],
            project__owner=self.request.user,
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


from rest_framework.decorators import api_view, permission_classes as perm_classes
from rest_framework.parsers import MultiPartParser, FormParser


class FileAnalyzeView(viewsets.ViewSet):
    """POST /{file_id}/analyze/ - Analyze a file with AI."""
    permission_classes = [permissions.IsAuthenticated]

    def create(self, request, project_id, pk=None):
        from services.ai_client import get_ai_client, validate_ai_provider

        project = get_object_or_404(Project, pk=project_id, owner=request.user)
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

        return Response({
            'file_id': project_file.id,
            'ai_summary': result.get('summary', ''),
            'analysis': result,
        })
