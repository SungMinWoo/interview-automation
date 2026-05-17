from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('projects', '0007_backfill_owner_members'),
    ]

    operations = [
        migrations.AddField(
            model_name='project',
            name='interview_purpose',
            field=models.TextField(blank=True, default='', help_text='메일 및 설문 페이지 상단에 표시될 인터뷰 안내문'),
            preserve_default=False,
        ),
    ]
