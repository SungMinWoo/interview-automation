from django.contrib import admin
from .models import Questionnaire, PositionCategory, Question


class QuestionInline(admin.TabularInline):
    model = Question
    extra = 0
    fields = ['text', 'question_type', 'is_required', 'order']


class PositionCategoryInline(admin.TabularInline):
    model = PositionCategory
    extra = 0


@admin.register(Questionnaire)
class QuestionnaireAdmin(admin.ModelAdmin):
    list_display = ['id', 'project', 'title', 'created_at', 'updated_at']
    search_fields = ['title', 'project__title']
    raw_id_fields = ['project']
    inlines = [PositionCategoryInline, QuestionInline]


@admin.register(PositionCategory)
class PositionCategoryAdmin(admin.ModelAdmin):
    list_display = ['id', 'questionnaire', 'name', 'order']
    list_filter = ['questionnaire']
    search_fields = ['name']


@admin.register(Question)
class QuestionAdmin(admin.ModelAdmin):
    list_display = ['id', 'questionnaire', 'text_short', 'question_type', 'is_required', 'order']
    list_filter = ['question_type', 'is_required']
    search_fields = ['text']
    raw_id_fields = ['questionnaire']

    @admin.display(description='Text')
    def text_short(self, obj):
        return obj.text[:60] + '...' if len(obj.text) > 60 else obj.text
