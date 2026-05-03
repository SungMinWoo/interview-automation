import django.db.models.deletion
from django.conf import settings
from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        migrations.swappable_dependency(settings.AUTH_USER_MODEL),
        ('projects', '0005_project_project_type'),
    ]

    operations = [
        migrations.CreateModel(
            name='ProjectMember',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('role', models.CharField(
                    choices=[('owner', '소유자'), ('admin', '관리자'), ('editor', '편집자'), ('viewer', '뷰어')],
                    default='viewer',
                    max_length=10,
                )),
                ('user_name', models.CharField(blank=True, help_text='비정규화 — 유저 삭제 후 이력 유지', max_length=100)),
                ('user_email', models.EmailField(blank=True, help_text='비정규화 — 유저 삭제 후 이력 유지', max_length=254)),
                ('created_at', models.DateTimeField(auto_now_add=True)),
                ('updated_at', models.DateTimeField(auto_now=True)),
                ('invited_by', models.ForeignKey(
                    blank=True,
                    null=True,
                    on_delete=django.db.models.deletion.SET_NULL,
                    related_name='+',
                    to=settings.AUTH_USER_MODEL,
                )),
                ('project', models.ForeignKey(
                    on_delete=django.db.models.deletion.CASCADE,
                    related_name='members',
                    to='projects.project',
                )),
                ('user', models.ForeignKey(
                    on_delete=django.db.models.deletion.CASCADE,
                    related_name='project_memberships',
                    to=settings.AUTH_USER_MODEL,
                )),
            ],
            options={
                'db_table': 'projects_projectmember',
                'ordering': ['role', 'created_at'],
                'unique_together': {('project', 'user')},
            },
        ),
    ]
