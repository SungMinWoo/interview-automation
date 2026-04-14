from django.urls import path, include
from rest_framework.routers import DefaultRouter
from . import views

app_name = 'questionnaires'

router = DefaultRouter()
router.register(r'sections', views.QuestionSectionViewSet, basename='section')
router.register(r'questions', views.QuestionViewSet, basename='question')
router.register(r'positions', views.PositionCategoryViewSet, basename='position')

urlpatterns = [
    path('generate/', views.GenerateQuestionnaireView.as_view(), name='generate'),
    path('confirm/', views.QuestionnaireConfirmView.as_view(), name='confirm'),
    path('status/', views.QuestionnaireStatusView.as_view(), name='status'),
    path('', views.QuestionnaireDetailView.as_view(), name='detail'),
    path('questions/reorder/', views.QuestionReorderView.as_view(), name='question-reorder'),
    path('sections/<int:section_id>/generate/', views.GenerateSectionQuestionsView.as_view(), name='section-generate'),
    path('', include(router.urls)),
]
