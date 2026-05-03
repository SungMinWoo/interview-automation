from django.contrib import admin

from .models import Project, ProjectMember, ReferenceSite


class ReferenceSiteInline(admin.TabularInline):
    model = ReferenceSite
    extra = 0


class ProjectMemberInline(admin.TabularInline):
    model = ProjectMember
    extra = 0
    readonly_fields = ['created_at']


@admin.register(Project)
class ProjectAdmin(admin.ModelAdmin):
    list_display = ['title', 'client_name', 'owner', 'status', 'created_at']
    list_filter = ['status', 'created_at']
    search_fields = ['title', 'client_name']
    inlines = [ReferenceSiteInline, ProjectMemberInline]


@admin.register(ProjectMember)
class ProjectMemberAdmin(admin.ModelAdmin):
    list_display = ['project', 'user', 'role', 'created_at']
    list_filter = ['role']
    search_fields = ['user_name', 'user_email']


@admin.register(ReferenceSite)
class ReferenceSiteAdmin(admin.ModelAdmin):
    list_display = ['title', 'url', 'project', 'order', 'created_at']
    list_filter = ['created_at']
    search_fields = ['title', 'url']
