from rest_framework import serializers

from .models import Project, ReferenceSite, ProjectDepartment, ProjectPosition, ProjectFile, ProjectActivity


class ReferenceSiteSerializer(serializers.ModelSerializer):
    class Meta:
        model = ReferenceSite
        fields = [
            'id', 'url', 'title', 'description',
            'screenshot_path', 'crawl_data', 'order', 'created_at',
        ]
        read_only_fields = ['id', 'created_at']


class ProjectDepartmentSerializer(serializers.ModelSerializer):
    class Meta:
        model = ProjectDepartment
        fields = ['id', 'name', 'order']
        read_only_fields = ['id']


class ProjectPositionSerializer(serializers.ModelSerializer):
    class Meta:
        model = ProjectPosition
        fields = ['id', 'name', 'weight', 'order']
        read_only_fields = ['id']


class ProjectFileSerializer(serializers.ModelSerializer):
    class Meta:
        model = ProjectFile
        fields = ['id', 'file', 'original_name', 'file_type', 'file_size', 'extracted_text', 'ai_summary', 'created_at']
        read_only_fields = ['id', 'original_name', 'file_type', 'file_size', 'extracted_text', 'ai_summary', 'created_at']


class ProjectActivitySerializer(serializers.ModelSerializer):
    class Meta:
        model = ProjectActivity
        fields = ['id', 'user_id', 'user_name', 'action', 'detail', 'created_at']
        read_only_fields = fields


class ProjectListSerializer(serializers.ModelSerializer):
    reference_sites_count = serializers.IntegerField(
        source='reference_sites.count', read_only=True,
    )

    class Meta:
        model = Project
        fields = [
            'id', 'project_type', 'title', 'client_name', 'status',
            'reference_sites_count', 'created_at', 'updated_at',
        ]
        read_only_fields = ['id', 'status', 'created_at', 'updated_at']


class ProjectDetailSerializer(serializers.ModelSerializer):
    reference_sites = ReferenceSiteSerializer(many=True, read_only=True)
    departments = ProjectDepartmentSerializer(many=True, read_only=True)
    positions = ProjectPositionSerializer(many=True, read_only=True)
    files = ProjectFileSerializer(many=True, read_only=True)

    class Meta:
        model = Project
        fields = [
            'id', 'project_type', 'title', 'client_name', 'client_contact_email',
            'client_contact_phone', 'requirements_text', 'existing_site_url',
            'status', 'reference_sites', 'departments', 'positions', 'files',
            'created_at', 'updated_at',
        ]
        read_only_fields = ['id', 'status', 'created_at', 'updated_at']


class ProjectCreateSerializer(serializers.ModelSerializer):
    reference_sites = ReferenceSiteSerializer(many=True, required=False)
    departments = ProjectDepartmentSerializer(many=True, required=False)
    positions = ProjectPositionSerializer(many=True, required=False)

    class Meta:
        model = Project
        fields = [
            'id', 'project_type', 'title', 'client_name', 'client_contact_email',
            'client_contact_phone', 'requirements_text', 'existing_site_url',
            'reference_sites', 'departments', 'positions',
        ]
        read_only_fields = ['id']

    def create(self, validated_data):
        reference_sites_data = validated_data.pop('reference_sites', [])
        departments_data = validated_data.pop('departments', [])
        positions_data = validated_data.pop('positions', [])
        project = Project.objects.create(**validated_data)
        for idx, site_data in enumerate(reference_sites_data):
            site_data.setdefault('order', idx)
            ReferenceSite.objects.create(project=project, **site_data)
        for idx, dept_data in enumerate(departments_data):
            dept_data.setdefault('order', idx)
            ProjectDepartment.objects.create(project=project, **dept_data)
        for idx, pos_data in enumerate(positions_data):
            pos_data.setdefault('order', idx)
            ProjectPosition.objects.create(project=project, **pos_data)
        return project


class ProjectUpdateSerializer(serializers.ModelSerializer):
    class Meta:
        model = Project
        fields = [
            'id', 'project_type', 'title', 'client_name', 'client_contact_email',
            'client_contact_phone', 'requirements_text', 'existing_site_url',
        ]
        read_only_fields = ['id']
