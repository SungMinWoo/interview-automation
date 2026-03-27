from django.contrib import admin

from .models import SurveyResponse, Answer


class AnswerInline(admin.TabularInline):
    model = Answer
    extra = 0
    readonly_fields = ['question', 'text_value', 'choice_values', 'rating_value']


@admin.register(SurveyResponse)
class SurveyResponseAdmin(admin.ModelAdmin):
    list_display = [
        'employee', 'project', 'is_manual', 'started_at', 'completed_at',
    ]
    list_filter = ['project', 'is_manual', 'completed_at']
    search_fields = ['employee__name', 'employee__email']
    inlines = [AnswerInline]


@admin.register(Answer)
class AnswerAdmin(admin.ModelAdmin):
    list_display = ['response', 'question', 'text_value', 'rating_value', 'created_at']
    list_filter = ['created_at']
    search_fields = ['response__employee__name', 'question__text']
