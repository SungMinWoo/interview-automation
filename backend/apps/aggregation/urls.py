from django.urls import path, include
from rest_framework.routers import DefaultRouter
from . import views

app_name = 'aggregation'

keyword_router = DefaultRouter()
keyword_router.register(r'', views.KeywordViewSet, basename='keyword')

sentence_router = DefaultRouter()
sentence_router.register(r'', views.SentenceViewSet, basename='sentence')

urlpatterns = [
    path('trigger/', views.TriggerAggregationView.as_view(), name='trigger'),
    path('', views.AggregationDetailView.as_view(), name='detail'),
    path('status/', views.AggregationStatusView.as_view(), name='status'),
    path('regenerate/', views.RegenerateAggregationView.as_view(), name='regenerate'),
    path('keywords/', include(keyword_router.urls)),
    path('sentences/', include(sentence_router.urls)),
]
