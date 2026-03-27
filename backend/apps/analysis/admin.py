from django.contrib import admin
from .models import SiteAnalysis, ProjectAnalysis


@admin.register(SiteAnalysis)
class SiteAnalysisAdmin(admin.ModelAdmin):
    list_display = ['id', 'project', 'url', 'is_existing_site', 'created_at']
    list_filter = ['is_existing_site', 'created_at']
    search_fields = ['url', 'project__title']
    raw_id_fields = ['project', 'reference_site']


@admin.register(ProjectAnalysis)
class ProjectAnalysisAdmin(admin.ModelAdmin):
    list_display = ['id', 'project', 'status', 'confirmed_at', 'created_at', 'updated_at']
    list_filter = ['status', 'created_at']
    search_fields = ['project__title']
    raw_id_fields = ['project']
    readonly_fields = ['created_at', 'updated_at']
