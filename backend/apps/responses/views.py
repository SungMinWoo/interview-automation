import bcrypt
from datetime import timedelta

from django.db import transaction
from django.shortcuts import get_object_or_404
from django.utils import timezone
from rest_framework import permissions, status
from rest_framework.response import Response
from rest_framework.views import APIView

from apps.projects.models import Project
from apps.distribution.models import Employee, SurveyInvitation
from .models import SurveyResponse, Answer
from .serializers import (
    SurveyResponseListSerializer,
    SurveyResponseDetailSerializer,
    ManualEntryStartSerializer,
    ManualEntrySubmitSerializer,
    AnswerSerializer,
)


def get_user_project(request, project_id):
    """Return a project owned by the requesting user or 404."""
    return get_object_or_404(Project, pk=project_id, owner=request.user)


# ──────────────────────────────────────────────
# Response views (project-nested, auth required)
# ──────────────────────────────────────────────

class ResponseListView(APIView):
    """GET - All responses for a project with status."""
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request, project_id):
        project = get_user_project(request, project_id)
        responses = SurveyResponse.objects.filter(project=project).select_related(
            'employee', 'invitation',
        )
        serializer = SurveyResponseListSerializer(responses, many=True)
        return Response(serializer.data)


class ResponseDetailView(APIView):
    """GET - Single response with all answers."""
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request, project_id, response_pk):
        project = get_user_project(request, project_id)
        response_obj = get_object_or_404(
            SurveyResponse.objects.select_related('employee').prefetch_related(
                'answers__question',
            ),
            pk=response_pk,
            project=project,
        )
        serializer = SurveyResponseDetailSerializer(response_obj)
        return Response(serializer.data)


class CloseCollectionView(APIView):
    """POST - Close response collection, update project status to CLOSED."""
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request, project_id):
        project = get_user_project(request, project_id)

        if project.status not in (Project.Status.COLLECTING, Project.Status.DISTRIBUTING):
            return Response(
                {'detail': 'Project is not in a collectible state.'},
                status=status.HTTP_400_BAD_REQUEST,
            )

        # Expire all pending/sent invitations
        SurveyInvitation.objects.filter(
            project=project,
            status__in=[SurveyInvitation.Status.PENDING, SurveyInvitation.Status.SENT],
        ).update(status=SurveyInvitation.Status.EXPIRED)

        project.status = Project.Status.CLOSED
        project.save(update_fields=['status', 'updated_at'])

        return Response({'detail': 'Response collection closed.', 'status': project.status})


# ──────────────────────────────────────────────
# Manual entry views (project-nested, auth required)
# ──────────────────────────────────────────────

class ManualEntryStartView(APIView):
    """POST - Create a manual entry session for an employee."""
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request, project_id):
        project = get_user_project(request, project_id)
        serializer = ManualEntryStartSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        employee_id = serializer.validated_data['employee_id']
        employee = get_object_or_404(Employee, pk=employee_id, project=project)

        # Create or get invitation for manual entry
        invitation, inv_created = SurveyInvitation.objects.get_or_create(
            employee=employee,
            defaults={
                'project': project,
                'password_hash': '',
                'expires_at': timezone.now() + timedelta(days=365),
                'is_manual_entry': True,
                'status': SurveyInvitation.Status.OPENED,
                'opened_at': timezone.now(),
            },
        )

        if not inv_created and not invitation.is_manual_entry:
            invitation.is_manual_entry = True
            invitation.save(update_fields=['is_manual_entry'])

        # Create response
        response_obj, created = SurveyResponse.objects.get_or_create(
            invitation=invitation,
            defaults={
                'project': project,
                'employee': employee,
                'is_manual': True,
                'entered_by': request.user,
            },
        )

        if not created:
            return Response(
                {
                    'detail': 'A response already exists for this employee.',
                    'response_id': response_obj.id,
                },
                status=status.HTTP_200_OK,
            )

        return Response(
            {
                'detail': 'Manual entry session created.',
                'response_id': response_obj.id,
                'employee_name': employee.name,
            },
            status=status.HTTP_201_CREATED,
        )


class ManualEntrySubmitView(APIView):
    """POST - Submit manually entered answers."""
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request, project_id):
        project = get_user_project(request, project_id)
        serializer = ManualEntrySubmitSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        response_id = serializer.validated_data['response_id']
        response_obj = get_object_or_404(
            SurveyResponse, pk=response_id, project=project, is_manual=True,
        )

        if response_obj.completed_at:
            return Response(
                {'detail': 'This manual entry has already been submitted.'},
                status=status.HTTP_400_BAD_REQUEST,
            )

        with transaction.atomic():
            # Clear any existing draft answers
            response_obj.answers.all().delete()

            for ans_data in serializer.validated_data['answers']:
                Answer.objects.create(
                    response=response_obj,
                    question_id=ans_data['question_id'],
                    text_value=ans_data.get('text_value', ''),
                    choice_values=ans_data.get('choice_values', []),
                    rating_value=ans_data.get('rating_value'),
                )

            response_obj.completed_at = timezone.now()
            response_obj.save(update_fields=['completed_at'])

            # Update invitation status
            invitation = response_obj.invitation
            invitation.status = SurveyInvitation.Status.COMPLETED
            invitation.completed_at = timezone.now()
            invitation.save(update_fields=['status', 'completed_at'])

        return Response({'detail': 'Manual entry submitted successfully.'})
