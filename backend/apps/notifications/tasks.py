from celery import shared_task


@shared_task
def create_project_notifications(project_id, event_type, title, message='',
                                  detail=None, exclude_user_id=None, actor_id=None):
    """비동기 알림 생성 — 요청-응답 사이클 차단 방지."""
    from django.contrib.auth import get_user_model
    from apps.projects.models import Project
    from .services import notify_project_members

    User = get_user_model()

    try:
        project = Project.objects.get(pk=project_id)
    except Project.DoesNotExist:
        return 0

    exclude_user = User.objects.filter(pk=exclude_user_id).first() if exclude_user_id else None
    actor = User.objects.filter(pk=actor_id).first() if actor_id else None

    return notify_project_members(
        project=project,
        event_type=event_type,
        title=title,
        message=message,
        detail=detail,
        exclude_user=exclude_user,
        actor=actor,
    )
