from django.contrib import admin

from .models import Employee, SurveyInvitation


class SurveyInvitationInline(admin.StackedInline):
    model = SurveyInvitation
    extra = 0
    readonly_fields = ['token', 'password_hash', 'sent_at', 'opened_at', 'completed_at']


@admin.register(Employee)
class EmployeeAdmin(admin.ModelAdmin):
    list_display = ['name', 'email', 'position', 'department', 'project', 'created_at']
    list_filter = ['project', 'department', 'created_at']
    search_fields = ['name', 'email', 'position']
    inlines = [SurveyInvitationInline]


@admin.register(SurveyInvitation)
class SurveyInvitationAdmin(admin.ModelAdmin):
    list_display = ['employee', 'project', 'status', 'expires_at', 'sent_at', 'created_at']
    list_filter = ['status', 'project', 'created_at']
    search_fields = ['employee__name', 'employee__email']
    readonly_fields = ['token', 'password_hash']
