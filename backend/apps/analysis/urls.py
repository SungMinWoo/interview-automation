from django.urls import path
from . import views

app_name = 'analysis'

urlpatterns = [
    path('trigger/', views.TriggerAnalysisView.as_view(), name='trigger'),
    path('', views.AnalysisDetailUpdateView.as_view(), name='detail'),
    path('confirm/', views.AnalysisConfirmView.as_view(), name='confirm'),
    path('status/', views.AnalysisStatusView.as_view(), name='status'),
    path('regenerate-section/', views.RegenerateAnalysisSectionView.as_view(), name='regenerate-section'),
]
