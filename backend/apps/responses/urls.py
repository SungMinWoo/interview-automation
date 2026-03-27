from django.urls import path

from .views import ResponseListView, ResponseDetailView, CloseCollectionView

urlpatterns = [
    path('', ResponseListView.as_view(), name='response-list'),
    path('<int:response_pk>/', ResponseDetailView.as_view(), name='response-detail'),
    path('close/', CloseCollectionView.as_view(), name='response-close'),
]
