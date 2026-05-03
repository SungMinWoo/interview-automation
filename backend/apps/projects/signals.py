from django.db import models, transaction
from django.db.models.signals import pre_delete
from django.dispatch import receiver
from django.contrib.auth import get_user_model

User = get_user_model()


@receiver(pre_delete, sender=User)
def handle_owner_deletion(sender, instance, **kwargs):
    """유저 삭제 전: 소유 프로젝트 소유권 자동 이전 또는 프로젝트 삭제."""
    from .models import Project, ProjectMember, log_activity

    owned_projects = Project.objects.filter(owner=instance)

    for project in owned_projects:
        # admin → editor → viewer 순으로 다음 소유자 선정
        next_owner_membership = (
            ProjectMember.objects
            .filter(project=project)
            .exclude(user=instance)
            .order_by(
                models.Case(
                    models.When(role='admin', then=0),
                    models.When(role='editor', then=1),
                    models.When(role='viewer', then=2),
                    default=3,
                    output_field=models.IntegerField(),
                ),
                'created_at',
            )
            .select_related('user')
            .first()
        )

        if next_owner_membership:
            with transaction.atomic():
                next_owner_membership.role = ProjectMember.Role.OWNER
                next_owner_membership.save(update_fields=['role', 'updated_at'])
                project.owner = next_owner_membership.user
                project.save(update_fields=['owner', 'updated_at'])

                log_activity(project, None, 'ownership_auto_transferred', {
                    'from_user': instance.email,
                    'to_user': next_owner_membership.user.email,
                    'reason': 'user_deleted',
                })
        else:
            # 다른 멤버가 없으면 프로젝트 삭제
            project.delete()
