from rest_framework import viewsets, permissions, status
from rest_framework.response import Response
from django.shortcuts import get_object_or_404

from .models import Project, ReferenceSite
from .serializers import (
    ProjectListSerializer,
    ProjectDetailSerializer,
    ProjectCreateSerializer,
    ProjectUpdateSerializer,
    ReferenceSiteSerializer,
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
