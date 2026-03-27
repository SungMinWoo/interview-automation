from django.contrib import admin
from .models import DesignBrief, StitchGeneration


class StitchGenerationInline(admin.TabularInline):
    model = StitchGeneration
    extra = 0
    fields = ['prompt_text', 'version', 'status', 'stitch_project_id', 'created_at']
    readonly_fields = ['created_at']


@admin.register(DesignBrief)
class DesignBriefAdmin(admin.ModelAdmin):
    list_display = ['id', 'project', 'title', 'aggregation', 'created_at', 'updated_at']
    search_fields = ['title', 'project__title']
    raw_id_fields = ['project', 'aggregation']
    inlines = [StitchGenerationInline]


@admin.register(StitchGeneration)
class StitchGenerationAdmin(admin.ModelAdmin):
    list_display = ['id', 'design_brief', 'version', 'status', 'stitch_project_id', 'created_at']
    list_filter = ['status']
    search_fields = ['design_brief__title', 'stitch_project_id']
    raw_id_fields = ['design_brief']
