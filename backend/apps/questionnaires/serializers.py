from rest_framework import serializers
from .models import Questionnaire, PositionCategory, QuestionSection, Question


class PositionCategorySerializer(serializers.ModelSerializer):
    class Meta:
        model = PositionCategory
        fields = ['id', 'questionnaire', 'name', 'order']
        read_only_fields = ['id', 'questionnaire']


class QuestionSerializer(serializers.ModelSerializer):
    position_categories = serializers.PrimaryKeyRelatedField(
        many=True, queryset=PositionCategory.objects.all(), required=False,
    )

    class Meta:
        model = Question
        fields = [
            'id', 'questionnaire', 'section', 'sub_category',
            'text', 'description', 'question_type', 'order', 'options',
            'importance', 'purpose',
            'position_categories', 'target_departments', 'target_positions',
            'created_at', 'updated_at',
        ]
        read_only_fields = ['id', 'questionnaire', 'created_at', 'updated_at']

    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)
        from apps.projects.models import ProjectDepartment, ProjectPosition
        self.fields['target_departments'] = serializers.PrimaryKeyRelatedField(
            many=True, queryset=ProjectDepartment.objects.all(), required=False,
        )
        self.fields['target_positions'] = serializers.PrimaryKeyRelatedField(
            many=True, queryset=ProjectPosition.objects.all(), required=False,
        )


class QuestionSectionSerializer(serializers.ModelSerializer):
    questions = QuestionSerializer(many=True, read_only=True)

    class Meta:
        model = QuestionSection
        fields = ['id', 'questionnaire', 'title', 'description', 'importance', 'target_area', 'order', 'target_positions', 'questions']
        read_only_fields = ['id', 'questionnaire']

    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)
        from apps.projects.models import ProjectPosition
        self.fields['target_positions'] = serializers.PrimaryKeyRelatedField(
            many=True, queryset=ProjectPosition.objects.all(), required=False,
        )


class QuestionnaireSerializer(serializers.ModelSerializer):
    questions = serializers.SerializerMethodField()
    sections = QuestionSectionSerializer(many=True, read_only=True)
    position_categories = PositionCategorySerializer(many=True, read_only=True)

    def get_questions(self, obj):
        """Return only unsectioned questions (sectioned ones are nested under sections)."""
        qs = obj.questions.filter(section__isnull=True).order_by('order')
        return QuestionSerializer(qs, many=True).data

    class Meta:
        model = Questionnaire
        fields = [
            'id', 'project', 'title', 'description', 'status',
            'ai_generation_prompt', 'ai_provider', 'error_message',
            'sections', 'questions', 'position_categories',
            'created_at', 'updated_at',
        ]
        read_only_fields = ['id', 'project', 'status', 'ai_provider', 'error_message', 'created_at', 'updated_at']


class QuestionnaireStatusSerializer(serializers.ModelSerializer):
    class Meta:
        model = Questionnaire
        fields = ['id', 'status', 'ai_provider', 'error_message', 'updated_at']
        read_only_fields = fields


class QuestionReorderSerializer(serializers.Serializer):
    id = serializers.IntegerField()
    order = serializers.IntegerField()
