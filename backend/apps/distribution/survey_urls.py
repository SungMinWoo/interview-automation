from django.urls import path

from .views import (
    SurveyInfoView,
    SurveyVerifyView,
    SurveyQuestionsView,
    SurveySubmitView,
    SurveyDraftView,
)

urlpatterns = [
    path('<uuid:token>/', SurveyInfoView.as_view(), name='survey-info'),
    path('<uuid:token>/verify/', SurveyVerifyView.as_view(), name='survey-verify'),
    path('<uuid:token>/questions/', SurveyQuestionsView.as_view(), name='survey-questions'),
    path('<uuid:token>/submit/', SurveySubmitView.as_view(), name='survey-submit'),
    path('<uuid:token>/draft/', SurveyDraftView.as_view(), name='survey-draft'),
]
