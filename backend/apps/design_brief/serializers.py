from rest_framework import serializers
from .models import DesignBrief, StitchGeneration


class StitchGenerationSerializer(serializers.ModelSerializer):
    class Meta:
        model = StitchGeneration
        fields = [
            'id', 'design_brief', 'prompt_text', 'reference_images',
            'stitch_project_id', 'generated_html_url',
            'generated_screenshot_url', 'generated_html_content',
            'version', 'status', 'error_message', 'created_at',
        ]
        read_only_fields = [
            'id', 'design_brief', 'stitch_project_id',
            'generated_html_url', 'generated_screenshot_url',
            'generated_html_content', 'version', 'status',
            'error_message', 'created_at',
        ]


class DesignBriefSerializer(serializers.ModelSerializer):
    stitch_generations = StitchGenerationSerializer(many=True, read_only=True)

    class Meta:
        model = DesignBrief
        fields = [
            'id', 'project', 'aggregation', 'title', 'summary',
            'target_audience', 'design_direction', 'key_requirements',
            'selected_keywords', 'selected_sentences', 'tone_and_mood',
            'color_preferences', 'additional_notes',
            'stitch_generations', 'created_at', 'updated_at',
        ]
        read_only_fields = ['id', 'project', 'aggregation', 'created_at', 'updated_at']


class DesignBriefUpdateSerializer(serializers.ModelSerializer):
    class Meta:
        model = DesignBrief
        fields = [
            'id', 'title', 'summary', 'target_audience',
            'design_direction', 'key_requirements',
            'selected_keywords', 'selected_sentences',
            'tone_and_mood', 'color_preferences', 'additional_notes',
        ]
        read_only_fields = ['id']


class DesignBriefExportSerializer(serializers.ModelSerializer):
    class Meta:
        model = DesignBrief
        fields = [
            'title', 'summary', 'target_audience', 'design_direction',
            'key_requirements', 'selected_keywords', 'selected_sentences',
            'tone_and_mood', 'color_preferences', 'additional_notes',
        ]
