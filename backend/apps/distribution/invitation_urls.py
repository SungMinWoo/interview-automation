from django.urls import path

from .views import (
    GenerateInvitationsView,
    SendInvitationsView,
    InvitationListView,
    ResendInvitationView,
    RegenerateInvitationView,
)

urlpatterns = [
    path('', InvitationListView.as_view(), name='invitation-list'),
    path('generate/', GenerateInvitationsView.as_view(), name='invitation-generate'),
    path('send/', SendInvitationsView.as_view(), name='invitation-send'),
    path('<int:invitation_pk>/resend/', ResendInvitationView.as_view(), name='invitation-resend'),
    path('<int:employee_id>/regenerate/', RegenerateInvitationView.as_view(), name='invitation-regenerate'),
]
