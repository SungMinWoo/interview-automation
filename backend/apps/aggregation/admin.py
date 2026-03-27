from django.contrib import admin
from .models import Aggregation, ExtractedKeyword, ExtractedSentence


class ExtractedKeywordInline(admin.TabularInline):
    model = ExtractedKeyword
    extra = 0
    fields = ['text', 'category', 'weight', 'is_user_added', 'order']


class ExtractedSentenceInline(admin.TabularInline):
    model = ExtractedSentence
    extra = 0
    fields = ['text', 'category', 'source_question', 'is_user_added', 'order']


@admin.register(Aggregation)
class AggregationAdmin(admin.ModelAdmin):
    list_display = ['id', 'project', 'status', 'version', 'created_at']
    list_filter = ['status']
    search_fields = ['project__title']
    raw_id_fields = ['project']
    inlines = [ExtractedKeywordInline, ExtractedSentenceInline]


@admin.register(ExtractedKeyword)
class ExtractedKeywordAdmin(admin.ModelAdmin):
    list_display = ['id', 'aggregation', 'text', 'category', 'weight', 'is_user_added', 'order']
    list_filter = ['category', 'is_user_added']
    search_fields = ['text']
    raw_id_fields = ['aggregation']


@admin.register(ExtractedSentence)
class ExtractedSentenceAdmin(admin.ModelAdmin):
    list_display = ['id', 'aggregation', 'text_short', 'category', 'is_user_added', 'order']
    list_filter = ['category', 'is_user_added']
    search_fields = ['text']
    raw_id_fields = ['aggregation', 'source_question']

    @admin.display(description='Text')
    def text_short(self, obj):
        return obj.text[:60] + '...' if len(obj.text) > 60 else obj.text
