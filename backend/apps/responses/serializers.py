from rest_framework import serializers
from .models import SurveyResponse, Answer, ManualEntryDraft, ManualEntryDraftAnswer


class AnswerSerializer(serializers.ModelSerializer):
    question_text = serializers.CharField(source='question.text', read_only=True)
    question_type = serializers.CharField(source='question.question_type', read_only=True)

    class Meta:
        model = Answer
        fields = [
            'id', 'question', 'question_text', 'question_type',
            'text_value', 'choice_values', 'rating_value',
            'created_at', 'updated_at',
        ]
        read_only_fields = ['id', 'created_at', 'updated_at']


class SurveyResponseListSerializer(serializers.ModelSerializer):
    employee_name = serializers.CharField(source='employee.name', read_only=True)
    employee_position = serializers.CharField(source='employee.position', read_only=True)
    employee_department = serializers.CharField(source='employee.department', read_only=True)
    answer_count = serializers.IntegerField(source='answers.count', read_only=True)
    invitation_status = serializers.CharField(source='invitation.status', read_only=True)

    class Meta:
        model = SurveyResponse
        fields = [
            'id', 'employee', 'employee_name', 'employee_position',
            'employee_department', 'invitation_status', 'answer_count',
            'started_at', 'completed_at', 'is_manual',
        ]
        read_only_fields = fields


class SurveyResponseDetailSerializer(serializers.ModelSerializer):
    employee_name = serializers.CharField(source='employee.name', read_only=True)
    employee_position = serializers.CharField(source='employee.position', read_only=True)
    employee_department = serializers.CharField(source='employee.department', read_only=True)
    answers = AnswerSerializer(many=True, read_only=True)

    class Meta:
        model = SurveyResponse
        fields = [
            'id', 'employee', 'employee_name', 'employee_position',
            'employee_department', 'answers', 'started_at',
            'completed_at', 'is_manual', 'entered_by',
        ]
        read_only_fields = fields


class ManualEntryAnswerSerializer(serializers.Serializer):
    question_id = serializers.IntegerField()
    text_value = serializers.CharField(required=False, allow_blank=True, default='')
    choice_values = serializers.ListField(
        child=serializers.CharField(), required=False, default=list,
    )
    rating_value = serializers.IntegerField(required=False, allow_null=True, default=None)


class ManualEntryStartSerializer(serializers.Serializer):
    employee_id = serializers.IntegerField()


class ManualEntrySubmitSerializer(serializers.Serializer):
    response_id = serializers.IntegerField()
    answers = ManualEntryAnswerSerializer(many=True)

    def validate_answers(self, value):
        if not value:
            raise serializers.ValidationError("At least one answer is required.")
        return value


# ── 대면 인터뷰 멤버별 draft ──

class ManualEntryDraftAnswerSerializer(serializers.ModelSerializer):
    class Meta:
        model = ManualEntryDraftAnswer
        fields = ['question', 'text_value', 'choice_values', 'rating_value', 'updated_at']
        read_only_fields = ['updated_at']


class ManualEntryDraftSerializer(serializers.ModelSerializer):
    author_name = serializers.SerializerMethodField()
    employee_name = serializers.CharField(source='employee.name', read_only=True)
    answers = ManualEntryDraftAnswerSerializer(many=True, read_only=True)
    answer_count = serializers.IntegerField(source='answers.count', read_only=True)

    class Meta:
        model = ManualEntryDraft
        fields = [
            'id', 'project', 'employee', 'employee_name', 'author', 'author_name',
            'is_submitted', 'submitted_at', 'answers', 'answer_count',
            'started_at', 'updated_at',
        ]
        read_only_fields = [
            'id', 'project', 'employee', 'author', 'author_name',
            'submitted_at', 'answers', 'answer_count', 'started_at', 'updated_at',
        ]

    def get_author_name(self, obj):
        u = obj.author
        if not u:
            return None
        return u.first_name or u.username or u.email


class ManualEntryDraftListSerializer(serializers.ModelSerializer):
    """answers 인라인 X, 카운트만 — 한 인터뷰이 화면에서 draft 목록을 가볍게 보일 때 사용."""
    author_name = serializers.SerializerMethodField()
    answer_count = serializers.IntegerField(source='answers.count', read_only=True)

    class Meta:
        model = ManualEntryDraft
        fields = [
            'id', 'project', 'employee', 'author', 'author_name',
            'is_submitted', 'submitted_at', 'answer_count',
            'started_at', 'updated_at',
        ]
        read_only_fields = fields

    def get_author_name(self, obj):
        u = obj.author
        if not u:
            return None
        return u.first_name or u.username or u.email


class ManualEntryMergeSerializer(serializers.Serializer):
    """머지 시 최종 답변 입력. 기존 ManualEntryAnswerSerializer 재사용."""
    answers = ManualEntryAnswerSerializer(many=True)
