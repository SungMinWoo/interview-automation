import django.db.models.deletion
from django.conf import settings
from django.db import migrations, models


class Migration(migrations.Migration):

    initial = True

    dependencies = [
        migrations.swappable_dependency(settings.AUTH_USER_MODEL),
        ('projects', '0007_backfill_owner_members'),
    ]

    operations = [
        migrations.CreateModel(
            name='Notification',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('event_type', models.CharField(
                    choices=[
                        ('status_changed', '상태 변경'),
                        ('member_added', '멤버 추가'),
                        ('member_removed', '멤버 제거'),
                        ('member_role_changed', '역할 변경'),
                        ('analysis_completed', '분석 완료'),
                        ('analysis_confirmed', '분석 확인'),
                        ('questionnaire_ready', '질문지 준비'),
                        ('questionnaire_confirmed', '질문지 확정'),
                        ('invitations_sent', '초대 발송'),
                        ('collection_closed', '수집 마감'),
                        ('aggregation_completed', '취합 완료'),
                        ('brief_ready', '브리프 완료'),
                        ('ownership_transferred', '소유권 이전'),
                    ],
                    max_length=40,
                )),
                ('title', models.CharField(max_length=200)),
                ('message', models.TextField(blank=True)),
                ('detail', models.JSONField(blank=True, default=dict)),
                ('actor_id', models.IntegerField(blank=True, help_text='행위자 User ID (비정규화)', null=True)),
                ('actor_name', models.CharField(blank=True, help_text='행위자 이름 (비정규화)', max_length=100)),
                ('is_read', models.BooleanField(default=False)),
                ('read_at', models.DateTimeField(blank=True, null=True)),
                ('created_at', models.DateTimeField(auto_now_add=True)),
                ('project', models.ForeignKey(
                    blank=True,
                    null=True,
                    on_delete=django.db.models.deletion.CASCADE,
                    related_name='notifications',
                    to='projects.project',
                )),
                ('recipient', models.ForeignKey(
                    on_delete=django.db.models.deletion.CASCADE,
                    related_name='notifications',
                    to=settings.AUTH_USER_MODEL,
                )),
            ],
            options={
                'db_table': 'notifications_notification',
                'ordering': ['-created_at'],
                'indexes': [
                    models.Index(fields=['recipient', 'is_read', '-created_at'], name='notificatio_recipie_idx'),
                ],
            },
        ),
    ]
