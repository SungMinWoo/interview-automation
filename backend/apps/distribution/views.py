import bcrypt
import jwt
from datetime import timedelta

from django.conf import settings
from django.db import transaction
from django.shortcuts import get_object_or_404
from django.utils import timezone
from rest_framework import permissions, status, viewsets
from rest_framework.response import Response
from rest_framework.views import APIView

from apps.projects.models import Project
from apps.questionnaires.models import Question
from apps.responses.models import SurveyResponse, Answer
from .models import Employee, SurveyInvitation
from .serializers import (
    EmployeeSerializer,
    BulkEmployeeSerializer,
    SurveyInvitationSerializer,
    SurveyInfoSerializer,
    SurveyVerifySerializer,
    SurveySubmitSerializer,
    SurveyDraftSerializer,
)


def get_user_project(request, project_id):
    """Return a project owned by the requesting user or 404."""
    return get_object_or_404(Project, pk=project_id, owner=request.user)


# ──────────────────────────────────────────────
# Employee views (project-nested, auth required)
# ──────────────────────────────────────────────

class EmployeeViewSet(viewsets.ModelViewSet):
    serializer_class = EmployeeSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_project(self):
        return get_user_project(self.request, self.kwargs['project_id'])

    def get_queryset(self):
        return Employee.objects.filter(
            project__pk=self.kwargs['project_id'],
            project__owner=self.request.user,
        )

    def perform_create(self, serializer):
        project = self.get_project()
        serializer.save(project=project)


class BulkEmployeeCreateView(APIView):
    """POST - Accept a list of employees and create them in bulk."""
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request, project_id):
        project = get_user_project(request, project_id)
        serializer = BulkEmployeeSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        employees_data = serializer.validated_data['employees']
        created = []
        with transaction.atomic():
            for emp_data in employees_data:
                emp_data.pop('project', None)
                employee = Employee.objects.create(project=project, **emp_data)
                created.append(employee)

        return Response(
            EmployeeSerializer(created, many=True).data,
            status=status.HTTP_201_CREATED,
        )


# ──────────────────────────────────────────────
# Invitation views (project-nested, auth required)
# ──────────────────────────────────────────────

class GenerateInvitationsView(APIView):
    """POST - Create invitations for all employees that don't have one yet."""
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request, project_id):
        project = get_user_project(request, project_id)
        employees = Employee.objects.filter(project=project).exclude(
            invitation__isnull=False,
        )

        expiry_days = getattr(settings, 'SURVEY_URL_EXPIRY_DAYS', 7)
        expires_at = timezone.now() + timedelta(days=expiry_days)
        created = []

        with transaction.atomic():
            for employee in employees:
                # Hash last 4 digits of phone as password
                last4 = employee.phone[-4:]
                password_hash = bcrypt.hashpw(
                    last4.encode('utf-8'), bcrypt.gensalt(),
                ).decode('utf-8')

                invitation = SurveyInvitation.objects.create(
                    employee=employee,
                    project=project,
                    password_hash=password_hash,
                    expires_at=expires_at,
                )
                created.append(invitation)

        return Response(
            {
                'created_count': len(created),
                'invitations': SurveyInvitationSerializer(created, many=True).data,
            },
            status=status.HTTP_201_CREATED,
        )


class SendInvitationsView(APIView):
    """POST - Trigger email sending via Celery for pending invitations."""
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request, project_id):
        project = get_user_project(request, project_id)
        pending = SurveyInvitation.objects.filter(
            project=project,
            status=SurveyInvitation.Status.PENDING,
        )
        count = pending.count()

        if count == 0:
            return Response(
                {'detail': 'No pending invitations to send.'},
                status=status.HTTP_400_BAD_REQUEST,
            )

        from .tasks import send_invitation_emails
        invitation_ids = list(pending.values_list('id', flat=True))
        send_invitation_emails.delay(invitation_ids)

        return Response(
            {'detail': f'Sending {count} invitation(s).', 'count': count},
            status=status.HTTP_202_ACCEPTED,
        )


class InvitationListView(APIView):
    """GET - List all invitations for a project."""
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request, project_id):
        project = get_user_project(request, project_id)
        invitations = SurveyInvitation.objects.filter(project=project).select_related(
            'employee',
        )
        serializer = SurveyInvitationSerializer(invitations, many=True)
        return Response(serializer.data)


class ResendInvitationView(APIView):
    """POST - Resend a single invitation email."""
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request, project_id, invitation_pk):
        project = get_user_project(request, project_id)
        invitation = get_object_or_404(
            SurveyInvitation, pk=invitation_pk, project=project,
        )

        from .tasks import send_invitation_emails
        send_invitation_emails.delay([invitation.id])

        return Response(
            {'detail': 'Invitation resend triggered.'},
            status=status.HTTP_202_ACCEPTED,
        )


# ──────────────────────────────────────────────
# Public survey views (NO auth required)
# ──────────────────────────────────────────────

def _get_invitation_by_token(token):
    return get_object_or_404(
        SurveyInvitation.objects.select_related('employee', 'project'),
        token=token,
    )


def _create_survey_jwt(invitation):
    """Create a short-lived JWT for survey access."""
    payload = {
        'token': str(invitation.token),
        'exp': timezone.now() + timedelta(minutes=30),
        'iat': timezone.now(),
        'type': 'survey',
    }
    return jwt.encode(payload, settings.SECRET_KEY, algorithm='HS256')


def _verify_survey_jwt(request):
    """Verify survey JWT from Authorization header. Returns invitation or None."""
    auth_header = request.headers.get('Authorization', '')
    if not auth_header.startswith('Bearer '):
        return None

    token_str = auth_header.split(' ', 1)[1]
    try:
        payload = jwt.decode(token_str, settings.SECRET_KEY, algorithms=['HS256'])
    except (jwt.ExpiredSignatureError, jwt.InvalidTokenError):
        return None

    if payload.get('type') != 'survey':
        return None

    try:
        invitation = SurveyInvitation.objects.select_related(
            'employee', 'project',
        ).get(token=payload['token'])
    except SurveyInvitation.DoesNotExist:
        return None

    return invitation


class SurveyInfoView(APIView):
    """GET /api/v1/survey/<token>/ - Basic info, no password needed."""
    permission_classes = [permissions.AllowAny]
    authentication_classes = []

    def get(self, request, token):
        invitation = _get_invitation_by_token(token)
        data = SurveyInfoSerializer({
            'project_title': invitation.project.title,
            'employee_name': invitation.employee.name,
            'status': invitation.status,
            'is_expired': invitation.is_expired,
        }).data
        return Response(data)


class SurveyVerifyView(APIView):
    """POST /api/v1/survey/<token>/verify/ - Verify password, return JWT."""
    permission_classes = [permissions.AllowAny]
    authentication_classes = []

    def post(self, request, token):
        invitation = _get_invitation_by_token(token)

        if invitation.is_expired:
            return Response(
                {'detail': 'This survey link has expired.'},
                status=status.HTTP_410_GONE,
            )

        serializer = SurveyVerifySerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        password = serializer.validated_data['password']
        if not bcrypt.checkpw(
            password.encode('utf-8'),
            invitation.password_hash.encode('utf-8'),
        ):
            return Response(
                {'detail': 'Invalid password.'},
                status=status.HTTP_401_UNAUTHORIZED,
            )

        # Mark as opened
        if invitation.status == SurveyInvitation.Status.PENDING or \
                invitation.status == SurveyInvitation.Status.SENT:
            invitation.status = SurveyInvitation.Status.OPENED
            invitation.opened_at = timezone.now()
            invitation.save(update_fields=['status', 'opened_at'])

        access_token = _create_survey_jwt(invitation)
        return Response({'access_token': access_token})


class SurveyQuestionsView(APIView):
    """GET /api/v1/survey/<token>/questions/ - Questions filtered by position_category."""
    permission_classes = [permissions.AllowAny]
    authentication_classes = []

    def get(self, request, token):
        invitation = _verify_survey_jwt(request)
        if not invitation or str(invitation.token) != str(token):
            return Response(
                {'detail': 'Invalid or expired survey token.'},
                status=status.HTTP_401_UNAUTHORIZED,
            )

        employee = invitation.employee
        questionnaire = getattr(invitation.project, 'questionnaire', None)
        if not questionnaire:
            return Response(
                {'detail': 'No questionnaire configured for this project.'},
                status=status.HTTP_404_NOT_FOUND,
            )

        questions = Question.objects.filter(questionnaire=questionnaire)
        if employee.position_category:
            questions = questions.filter(
                position_categories=employee.position_category,
            )

        data = []
        for q in questions.order_by('order'):
            data.append({
                'id': q.id,
                'text': q.text,
                'description': q.description,
                'question_type': q.question_type,
                'is_required': q.is_required,
                'order': q.order,
                'options': q.options,
            })

        return Response(data)


class SurveySubmitView(APIView):
    """POST /api/v1/survey/<token>/submit/ - Submit all answers."""
    permission_classes = [permissions.AllowAny]
    authentication_classes = []

    def post(self, request, token):
        invitation = _verify_survey_jwt(request)
        if not invitation or str(invitation.token) != str(token):
            return Response(
                {'detail': 'Invalid or expired survey token.'},
                status=status.HTTP_401_UNAUTHORIZED,
            )

        if invitation.status == SurveyInvitation.Status.COMPLETED:
            return Response(
                {'detail': 'Survey already completed.'},
                status=status.HTTP_400_BAD_REQUEST,
            )

        serializer = SurveySubmitSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        with transaction.atomic():
            response_obj, _ = SurveyResponse.objects.get_or_create(
                invitation=invitation,
                defaults={
                    'project': invitation.project,
                    'employee': invitation.employee,
                },
            )
            # Clear existing answers (in case of draft -> submit)
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

            invitation.status = SurveyInvitation.Status.COMPLETED
            invitation.completed_at = timezone.now()
            invitation.save(update_fields=['status', 'completed_at'])

        return Response({'detail': 'Survey submitted successfully.'})


class SurveyDraftView(APIView):
    """PATCH /api/v1/survey/<token>/draft/ - Auto-save progress."""
    permission_classes = [permissions.AllowAny]
    authentication_classes = []

    def patch(self, request, token):
        invitation = _verify_survey_jwt(request)
        if not invitation or str(invitation.token) != str(token):
            return Response(
                {'detail': 'Invalid or expired survey token.'},
                status=status.HTTP_401_UNAUTHORIZED,
            )

        if invitation.status == SurveyInvitation.Status.COMPLETED:
            return Response(
                {'detail': 'Survey already completed.'},
                status=status.HTTP_400_BAD_REQUEST,
            )

        serializer = SurveyDraftSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        with transaction.atomic():
            response_obj, _ = SurveyResponse.objects.get_or_create(
                invitation=invitation,
                defaults={
                    'project': invitation.project,
                    'employee': invitation.employee,
                },
            )

            for ans_data in serializer.validated_data['answers']:
                Answer.objects.update_or_create(
                    response=response_obj,
                    question_id=ans_data['question_id'],
                    defaults={
                        'text_value': ans_data.get('text_value', ''),
                        'choice_values': ans_data.get('choice_values', []),
                        'rating_value': ans_data.get('rating_value'),
                    },
                )

        return Response({'detail': 'Draft saved.'})
