from django.conf import settings
from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('responses', '0001_initial'),
        ('projects', '0001_initial'),
        ('distribution', '0001_initial'),
        ('questionnaires', '0001_initial'),
        migrations.swappable_dependency(settings.AUTH_USER_MODEL),
    ]

    operations = [
        migrations.CreateModel(
            name='ManualEntryDraft',
            fields=[
                ('id', models.AutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('is_submitted', models.BooleanField(default=False, help_text='멤버가 본인 작성 완료를 선언')),
                ('submitted_at', models.DateTimeField(blank=True, null=True)),
                ('started_at', models.DateTimeField(auto_now_add=True)),
                ('updated_at', models.DateTimeField(auto_now=True)),
                ('author', models.ForeignKey(on_delete=models.deletion.CASCADE, related_name='manual_drafts', to=settings.AUTH_USER_MODEL)),
                ('employee', models.ForeignKey(on_delete=models.deletion.CASCADE, related_name='manual_drafts', to='distribution.employee')),
                ('project', models.ForeignKey(on_delete=models.deletion.CASCADE, related_name='manual_drafts', to='projects.project')),
            ],
            options={
                'db_table': 'responses_manualentrydraft',
                'ordering': ['-updated_at'],
                'unique_together': {('employee', 'author')},
            },
        ),
        migrations.CreateModel(
            name='ManualEntryDraftAnswer',
            fields=[
                ('id', models.AutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('text_value', models.TextField(blank=True)),
                ('choice_values', models.JSONField(blank=True, default=list)),
                ('rating_value', models.IntegerField(blank=True, null=True)),
                ('updated_at', models.DateTimeField(auto_now=True)),
                ('draft', models.ForeignKey(on_delete=models.deletion.CASCADE, related_name='answers', to='responses.manualentrydraft')),
                ('question', models.ForeignKey(on_delete=models.deletion.CASCADE, related_name='manual_draft_answers', to='questionnaires.question')),
            ],
            options={
                'db_table': 'responses_manualentrydraftanswer',
                'unique_together': {('draft', 'question')},
            },
        ),
    ]
