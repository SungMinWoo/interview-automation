from django.conf import settings
from rest_framework import serializers
from .models import Employee, SurveyInvitation


class EmployeeSerializer(serializers.ModelSerializer):
    class Meta:
        model = Employee
        fields = [
            'id', 'project', 'name', 'email', 'phone',
            'position', 'position_category', 'department', 'created_at',
        ]
        read_only_fields = ['id', 'project', 'created_at']


class BulkEmployeeSerializer(serializers.Serializer):
    employees = EmployeeSerializer(many=True)

    def validate_employees(self, value):
        if not value:
            raise serializers.ValidationError("At least one employee is required.")
        return value


class SurveyInvitationSerializer(serializers.ModelSerializer):
    employee_name = serializers.CharField(source='employee.name', read_only=True)
    employee_email = serializers.CharField(source='employee.email', read_only=True)
    employee_position = serializers.CharField(source='employee.position', read_only=True)
    is_expired = serializers.BooleanField(read_only=True)
    survey_url = serializers.SerializerMethodField()

    class Meta:
        model = SurveyInvitation
        fields = [
            'id', 'employee', 'employee_name', 'employee_email',
            'employee_position', 'token', 'status', 'expires_at',
            'sent_at', 'opened_at', 'completed_at', 'is_manual_entry',
            'is_expired', 'survey_url', 'password_plain', 'created_at',
        ]

    def get_survey_url(self, obj):
        return f"{settings.FRONTEND_URL}/survey/{obj.token}"


# --- Public survey serializers (no auth) ---

class SurveyInfoSerializer(serializers.Serializer):
    project_title = serializers.CharField()
    employee_name = serializers.CharField()
    status = serializers.CharField()
    is_expired = serializers.BooleanField()
    interview_purpose = serializers.CharField(allow_blank=True, required=False)


class SurveyVerifySerializer(serializers.Serializer):
    password = serializers.CharField(write_only=True)


class SurveyAnswerItemSerializer(serializers.Serializer):
    question_id = serializers.IntegerField()
    text_value = serializers.CharField(required=False, allow_blank=True, default='')
    choice_values = serializers.ListField(
        child=serializers.CharField(), required=False, default=list,
    )
    rating_value = serializers.IntegerField(required=False, allow_null=True, default=None)


class SurveySubmitSerializer(serializers.Serializer):
    answers = SurveyAnswerItemSerializer(many=True)

    def validate_answers(self, value):
        # Allow empty answers for partial submission
        return value


class SurveyDraftSerializer(serializers.Serializer):
    answers = SurveyAnswerItemSerializer(many=True)
