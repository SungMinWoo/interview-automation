from django.urls import include, path

urlpatterns = [
    path('api/v1/auth/', include('apps.accounts.urls')),
    path('api/v1/projects/', include('apps.projects.urls')),
    path('api/v1/survey/', include('apps.distribution.survey_urls')),
    path('api/v1/tools/', include('apps.tools.urls')),
    path('api/v1/notifications/', include('apps.notifications.urls')),
]
