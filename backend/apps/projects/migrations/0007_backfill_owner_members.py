from django.db import migrations


def forward(apps, schema_editor):
    """기존 프로젝트의 owner를 OWNER 멤버로 자동 생성."""
    Project = apps.get_model('projects', 'Project')
    ProjectMember = apps.get_model('projects', 'ProjectMember')
    for project in Project.objects.select_related('owner').all():
        ProjectMember.objects.get_or_create(
            project=project,
            user=project.owner,
            defaults={
                'role': 'owner',
                'user_name': project.owner.first_name or project.owner.username or '',
                'user_email': project.owner.email or '',
            },
        )


def backward(apps, schema_editor):
    """롤백 시 owner 멤버십만 삭제."""
    ProjectMember = apps.get_model('projects', 'ProjectMember')
    ProjectMember.objects.filter(role='owner').delete()


class Migration(migrations.Migration):

    dependencies = [
        ('projects', '0006_add_projectmember'),
    ]

    operations = [
        migrations.RunPython(forward, backward),
    ]
