from django.contrib import admin
from .models import Questionnaire, PositionCategory, QuestionSection, Question


class QuestionInline(admin.TabularInline):
    model = Question
    extra = 0
    fields = ['text', 'question_type', 'importance', 'section', 'order']


class QuestionSectionInline(admin.TabularInline):
    model = QuestionSection
    extra = 0


class PositionCategoryInline(admin.TabularInline):
    model = PositionCategory
    extra = 0


@admin.register(Questionnaire)
class QuestionnaireAdmin(admin.ModelAdmin):
    list_display = ['id', 'project', 'title', 'status', 'created_at']
    search_fields = ['title', 'project__title']
    raw_id_fields = ['project']
    inlines = [QuestionSectionInline, PositionCategoryInline, QuestionInline]


@admin.register(QuestionSection)
class QuestionSectionAdmin(admin.ModelAdmin):
    list_display = ['id', 'questionnaire', 'title', 'order']
    list_filter = ['questionnaire']
    search_fields = ['title']


@admin.register(PositionCategory)
class PositionCategoryAdmin(admin.ModelAdmin):
    list_display = ['id', 'questionnaire', 'name', 'order']
    list_filter = ['questionnaire']
    search_fields = ['name']


@admin.register(Question)
class QuestionAdmin(admin.ModelAdmin):
    list_display = ['id', 'questionnaire', 'section', 'text_short', 'question_type', 'importance', 'order']
    list_filter = ['question_type', 'importance']
    search_fields = ['text']
    raw_id_fields = ['questionnaire', 'section']

    @admin.display(description='Text')
    def text_short(self, obj):
        return obj.text[:60] + '...' if len(obj.text) > 60 else obj.text
