from django.contrib import admin

from .models import Project, ReferenceSite


class ReferenceSiteInline(admin.TabularInline):
    model = ReferenceSite
    extra = 0


@admin.register(Project)
class ProjectAdmin(admin.ModelAdmin):
    list_display = ['title', 'client_name', 'owner', 'status', 'created_at']
    list_filter = ['status', 'created_at']
    search_fields = ['title', 'client_name']
    inlines = [ReferenceSiteInline]


@admin.register(ReferenceSite)
class ReferenceSiteAdmin(admin.ModelAdmin):
    list_display = ['title', 'url', 'project', 'order', 'created_at']
    list_filter = ['created_at']
    search_fields = ['title', 'url']
