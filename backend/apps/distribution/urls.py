from django.urls import path, include
from rest_framework.routers import DefaultRouter

from .views import EmployeeViewSet, BulkEmployeeCreateView

router = DefaultRouter()
router.register(r'', EmployeeViewSet, basename='employee')

urlpatterns = router.urls + [
    path('bulk/', BulkEmployeeCreateView.as_view(), name='employee-bulk-create'),
]
