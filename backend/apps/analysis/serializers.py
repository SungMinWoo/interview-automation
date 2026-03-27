from rest_framework import serializers
from .models import SiteAnalysis, ProjectAnalysis


class SiteAnalysisSerializer(serializers.ModelSerializer):
    class Meta:
        model = SiteAnalysis
        fields = [
            'id', 'project', 'reference_site', 'is_existing_site',
            'url', 'screenshot_url', 'crawl_text', 'ai_analysis',
            'created_at',
        ]
        read_only_fields = ['id', 'created_at']


class ProjectAnalysisSerializer(serializers.ModelSerializer):
    site_analyses = SiteAnalysisSerializer(source='project.site_analyses', many=True, read_only=True)

    class Meta:
        model = ProjectAnalysis
        fields = [
            'id', 'project', 'status', 'requirements_summary',
            'existing_site_analysis', 'reference_sites_analysis',
            'combined_insights', 'user_edits', 'confirmed_at',
            'raw_ai_response', 'error_message',
            'created_at', 'updated_at', 'site_analyses',
        ]
        read_only_fields = [
            'id', 'project', 'status', 'requirements_summary',
            'existing_site_analysis', 'reference_sites_analysis',
            'combined_insights', 'confirmed_at', 'raw_ai_response',
            'error_message', 'created_at', 'updated_at',
        ]


class ProjectAnalysisUpdateSerializer(serializers.ModelSerializer):
    """Serializer for user edits on analysis results."""

    class Meta:
        model = ProjectAnalysis
        fields = ['user_edits']


class ProjectAnalysisStatusSerializer(serializers.ModelSerializer):
    class Meta:
        model = ProjectAnalysis
        fields = ['id', 'project', 'status', 'error_message', 'updated_at']
        read_only_fields = fields
