from django.urls import path, include
from rest_framework.routers import DefaultRouter

from .views import ProjectViewSet, ReferenceSiteViewSet

router = DefaultRouter()
router.register(r'', ProjectViewSet, basename='project')

reference_site_router = DefaultRouter()
reference_site_router.register(r'', ReferenceSiteViewSet, basename='reference-site')

urlpatterns = router.urls + [
    path(
        '<int:project_id>/reference-sites/',
        include(reference_site_router.urls),
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
