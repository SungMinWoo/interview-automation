from django.urls import path, include
from rest_framework.routers import DefaultRouter

from .views import (
    ProjectViewSet, ReferenceSiteViewSet, ProjectDepartmentViewSet,
    ProjectPositionViewSet, ProjectFileViewSet, FileAnalyzeView,
    ProjectActivityListView, ProjectMemberViewSet, TransferOwnershipView,
)

router = DefaultRouter()
router.register(r'', ProjectViewSet, basename='project')

reference_site_router = DefaultRouter()
reference_site_router.register(r'', ReferenceSiteViewSet, basename='reference-site')

department_router = DefaultRouter()
department_router.register(r'', ProjectDepartmentViewSet, basename='department')

position_router = DefaultRouter()
position_router.register(r'', ProjectPositionViewSet, basename='position')

file_router = DefaultRouter()
file_router.register(r'', ProjectFileViewSet, basename='file')

member_router = DefaultRouter()
member_router.register(r'', ProjectMemberViewSet, basename='member')

urlpatterns = router.urls + [
    path(
        '<int:project_id>/reference-sites/',
        include(reference_site_router.urls),
    ),
    path(
        '<int:project_id>/departments/',
        include(department_router.urls),
    ),
    path(
        '<int:project_id>/positions/',
        include(position_router.urls),
    ),
    path(
        '<int:project_id>/files/',
        include(file_router.urls),
    ),
    path(
        '<int:project_id>/files/<int:pk>/analyze/',
        FileAnalyzeView.as_view({'post': 'create'}),
        name='file-analyze',
    ),
    path(
        '<int:project_id>/members/',
        include(member_router.urls),
    ),
    path(
        '<int:project_id>/transfer-ownership/',
        TransferOwnershipView.as_view({'post': 'create'}),
        name='transfer-ownership',
    ),
    path(
        '<int:project_id>/activities/',
        ProjectActivityListView.as_view({'get': 'list'}),
        name='project-activities',
    ),
    path(
        '<int:project_id>/analysis/',
        include('apps.analysis.urls'),
    ),
    path(
        '<int:project_id>/questionnaire/',
        include('apps.questionnaires.urls'),
    ),
    path(
        '<int:project_id>/employees/',
        include('apps.distribution.urls'),
    ),
    path(
        '<int:project_id>/invitations/',
        include('apps.distribution.invitation_urls'),
    ),
    path(
        '<int:project_id>/responses/',
        include('apps.responses.urls'),
    ),
    path(
        '<int:project_id>/aggregation/',
        include('apps.aggregation.urls'),
    ),
    path(
        '<int:project_id>/design-brief/',
        include('apps.design_brief.urls'),
    ),
    path(
        '<int:project_id>/manual-entry/',
        include('apps.responses.manual_urls'),
    ),
]
