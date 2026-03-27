from django.urls import path

from .views import (
    GenerateInvitationsView,
    SendInvitationsView,
    InvitationListView,
    ResendInvitationView,
)

urlpatterns = [
    path('', InvitationListView.as_view(), name='invitation-list'),
    path('generate/', GenerateInvitationsView.as_view(), name='invitation-generate'),
    path('send/', SendInvitationsView.as_view(), name='invitation-send'),
    path('<int:invitation_pk>/resend/', ResendInvitationView.as_view(), name='invitation-resend'),
]
