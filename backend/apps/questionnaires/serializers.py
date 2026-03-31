from rest_framework import serializers
from .models import Questionnaire, PositionCategory, Question


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
            'id', 'questionnaire', 'text', 'description',
            'question_type', 'is_required', 'order', 'options',
            'importance', 'purpose',
            'position_categories', 'created_at', 'updated_at',
        ]
        read_only_fields = ['id', 'questionnaire', 'created_at', 'updated_at']


class QuestionnaireSerializer(serializers.ModelSerializer):
    questions = QuestionSerializer(many=True, read_only=True)
    position_categories = PositionCategorySerializer(many=True, read_only=True)

    class Meta:
        model = Questionnaire
        fields = [
            'id', 'project', 'title', 'description', 'status',
            'ai_generation_prompt', 'ai_provider', 'error_message',
            'questions', 'position_categories',
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
