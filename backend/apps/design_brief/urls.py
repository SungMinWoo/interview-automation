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
    path('stitch/<int:generation_id>/fetch/', views.StitchFetchScreensView.as_view(), name='stitch-fetch'),
    path('export/', views.ExportBriefView.as_view(), name='export'),
    path('design-md/generate/', views.GenerateDesignMdView.as_view(), name='design-md-generate'),
    path('design-md/download/', views.DownloadDesignMdView.as_view(), name='design-md-download'),
    path('complete/', views.CompleteProjectView.as_view(), name='complete-project'),
]
