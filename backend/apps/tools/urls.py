from django.urls import path
from . import views

app_name = 'tools'

urlpatterns = [
    path('analyze-site/', views.AnalyzeSiteView.as_view(), name='analyze-site'),
    path('analyze-file/', views.AnalyzeFileView.as_view(), name='analyze-file'),
]
