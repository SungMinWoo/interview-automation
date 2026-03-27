from django.urls import path
from . import views

app_name = 'design_brief'

urlpatterns = [
    path('compile/', views.CompileDesignBriefView.as_view(), name='compile'),
    path('', views.DesignBriefDetailView.as_view(), name='detail'),
    path('stitch/generate/', views.TriggerStitchView.as_view(), name='stitch-generate'),
    path('stitch/', views.StitchListView.as_view(), name='stitch-list'),
    path('stitch/<int:generation_id>/', views.StitchDetailView.as_view(), name='stitch-detail'),
    path('stitch/<int:generation_id>/regenerate/', views.StitchRegenerateView.as_view(), name='stitch-regenerate'),
    path('export/', views.ExportBriefView.as_view(), name='export'),
]
