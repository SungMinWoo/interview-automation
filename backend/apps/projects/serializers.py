from rest_framework import serializers

from .models import Project, ReferenceSite


class ReferenceSiteSerializer(serializers.ModelSerializer):
    class Meta:
        model = ReferenceSite
        fields = [
            'id', 'url', 'title', 'description',
            'screenshot_path', 'crawl_data', 'order', 'created_at',
        ]
        read_only_fields = ['id', 'created_at']


class ProjectListSerializer(serializers.ModelSerializer):
    reference_sites_count = serializers.IntegerField(
        source='reference_sites.count', read_only=True,
    )

    class Meta:
        model = Project
        fields = [
            'id', 'title', 'client_name', 'status',
            'reference_sites_count', 'created_at', 'updated_at',
        ]
        read_only_fields = ['id', 'status', 'created_at', 'updated_at']


class ProjectDetailSerializer(serializers.ModelSerializer):
    reference_sites = ReferenceSiteSerializer(many=True, read_only=True)

    class Meta:
        model = Project
        fields = [
            'id', 'title', 'client_name', 'client_contact_email',
            'client_contact_phone', 'requirements_text', 'existing_site_url',
            'status', 'reference_sites', 'created_at', 'updated_at',
        ]
        read_only_fields = ['id', 'status', 'created_at', 'updated_at']


class ProjectCreateSerializer(serializers.ModelSerializer):
    reference_sites = ReferenceSiteSerializer(many=True, required=False)

    class Meta:
        model = Project
        fields = [
            'id', 'title', 'client_name', 'client_contact_email',
            'client_contact_phone', 'requirements_text', 'existing_site_url',
            'reference_sites',
        ]
        read_only_fields = ['id']

    def create(self, validated_data):
        reference_sites_data = validated_data.pop('reference_sites', [])
        project = Project.objects.create(**validated_data)
        for idx, site_data in enumerate(reference_sites_data):
            site_data.setdefault('order', idx)
            ReferenceSite.objects.create(project=project, **site_data)
        return project


class ProjectUpdateSerializer(serializers.ModelSerializer):
    class Meta:
        model = Project
        fields = [
            'id', 'title', 'client_name', 'client_contact_email',
            'client_contact_phone', 'requirements_text', 'existing_site_url',
        ]
        read_only_fields = ['id']
