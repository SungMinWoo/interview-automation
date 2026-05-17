from django.urls import path

from .views import (
    ManualEntryStartView,
    ManualEntrySubmitView,
    MyManualDraftView,
    ManualDraftDetailView,
    ManualDraftSubmitView,
    EmployeeManualDraftsView,
    EmployeeManualDraftsDetailView,
    ManualMergeView,
    ManualAiMergeView,
)

urlpatterns = [
    path('start/', ManualEntryStartView.as_view(), name='manual-entry-start'),
    path('submit/', ManualEntrySubmitView.as_view(), name='manual-entry-submit'),

    # 멤버별 draft
    path('drafts/me/', MyManualDraftView.as_view(), name='manual-draft-me'),
    path('drafts/<int:draft_id>/', ManualDraftDetailView.as_view(), name='manual-draft-detail'),
    path('drafts/<int:draft_id>/submit/', ManualDraftSubmitView.as_view(), name='manual-draft-submit'),

    # 인터뷰이별 draft 모음 + 머지
    path('employees/<int:employee_id>/drafts/', EmployeeManualDraftsView.as_view(), name='employee-drafts'),
    path('employees/<int:employee_id>/drafts/detail/', EmployeeManualDraftsDetailView.as_view(), name='employee-drafts-detail'),
    path('employees/<int:employee_id>/merge/', ManualMergeView.as_view(), name='manual-merge'),
    path('employees/<int:employee_id>/ai-merge/', ManualAiMergeView.as_view(), name='manual-ai-merge'),
]
