from django.urls import path

from .views import ManualEntryStartView, ManualEntrySubmitView

urlpatterns = [
    path('start/', ManualEntryStartView.as_view(), name='manual-entry-start'),
    path('submit/', ManualEntrySubmitView.as_view(), name='manual-entry-submit'),
]
