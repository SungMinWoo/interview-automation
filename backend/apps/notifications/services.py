from .models import Notification


def notify_project_members(project, event_type, title, message='', detail=None,
                           exclude_user=None, actor=None, recipient_user_ids=None):
    """프로젝트 멤버에게 인앱 알림 생성.

    Args:
        project: 대상 프로젝트
        event_type: Notification.EventType 값
        title: 알림 제목
        message: 알림 본문 (선택)
        detail: 부가 정보 dict (선택)
        exclude_user: 제외할 유저 (행위자 본인 등)
        actor: 행위자 유저 객체
        recipient_user_ids: 지정 시 해당 user id 집합 멤버에게만 발송 (검토자 지정 등)
    """
    from apps.projects.models import ProjectMember

    members = ProjectMember.objects.filter(project=project).select_related('user')
    if recipient_user_ids is not None:
        members = members.filter(user_id__in=recipient_user_ids)
    if exclude_user:
        members = members.exclude(user=exclude_user)

    notifications = [
        Notification(
            recipient=member.user,
            project=project,
            event_type=event_type,
            title=title,
            message=message,
            detail=detail or {},
            actor_id=actor.id if actor else None,
            actor_name=(
                getattr(actor, 'first_name', '') or getattr(actor, 'username', '') or str(actor)
            ) if actor else '',
        )
        for member in members
    ]

    if notifications:
        Notification.objects.bulk_create(notifications)

    return len(notifications)
