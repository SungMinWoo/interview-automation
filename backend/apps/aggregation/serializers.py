from rest_framework import serializers
from .models import Aggregation, ExtractedKeyword, ExtractedSentence


class ExtractedKeywordSerializer(serializers.ModelSerializer):
    class Meta:
        model = ExtractedKeyword
        fields = [
            'id', 'aggregation', 'text', 'category',
            'weight', 'is_user_added', 'order',
        ]
        read_only_fields = ['id', 'aggregation']


class ExtractedSentenceSerializer(serializers.ModelSerializer):
    class Meta:
        model = ExtractedSentence
        fields = [
            'id', 'aggregation', 'text', 'category',
            'source_question', 'is_user_added', 'order',
        ]
        read_only_fields = ['id', 'aggregation']


class AggregationSerializer(serializers.ModelSerializer):
    keywords = ExtractedKeywordSerializer(many=True, read_only=True)
    sentences = ExtractedSentenceSerializer(many=True, read_only=True)

    class Meta:
        model = Aggregation
        fields = [
            'id', 'project', 'status', 'version', 'ai_provider',
            'raw_ai_response', 'summary', 'section_summaries',
            'company_direction', 'desired_changes', 'company_values',
            'error_message', 'keywords', 'sentences', 'created_at',
        ]
        read_only_fields = [
            'id', 'project', 'status', 'version', 'ai_provider',
            'raw_ai_response', 'error_message', 'created_at',
        ]


class AggregationStatusSerializer(serializers.ModelSerializer):
    class Meta:
        model = Aggregation
        fields = ['id', 'status', 'version', 'ai_provider', 'error_message']
        read_only_fields = fields
