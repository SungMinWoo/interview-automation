from django.conf import settings
from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('questionnaires', '0008_question_sub_category_questionsection_importance_and_more'),
        migrations.swappable_dependency(settings.AUTH_USER_MODEL),
    ]

    operations = [
        migrations.AddField(
            model_name='questionnaire',
            name='draft_by',
            field=models.ForeignKey(
                blank=True, null=True,
                help_text='최초로 의미 있는 편집을 한 멤버 (자동 기록)',
                on_delete=models.deletion.SET_NULL,
                related_name='+',
                to=settings.AUTH_USER_MODEL,
            ),
        ),
        migrations.AddField(
            model_name='questionnaire',
            name='reviewer',
            field=models.ForeignKey(
                blank=True, null=True,
                help_text='검토자로 지정된 멤버 — 지정 시 알림 발송',
                on_delete=models.deletion.SET_NULL,
                related_name='+',
                to=settings.AUTH_USER_MODEL,
            ),
        ),
        migrations.AddField(
            model_name='questionnaire',
            name='confirmed_by',
            field=models.ForeignKey(
                blank=True, null=True,
                help_text='질문지 확정 액션을 누른 멤버',
                on_delete=models.deletion.SET_NULL,
                related_name='+',
                to=settings.AUTH_USER_MODEL,
            ),
        ),
        migrations.AddField(
            model_name='questionnaire',
            name='confirmed_at',
            field=models.DateTimeField(blank=True, null=True),
        ),
    ]
