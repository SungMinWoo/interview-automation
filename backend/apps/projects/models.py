import uuid
from django.conf import settings
from django.db import models


class Project(models.Model):
    class ProjectType(models.TextChoices):
        UXUI = 'uxui', 'UX/UI'
        BX = 'bx', 'BX'

    class Status(models.TextChoices):
        CREATED = 'created', '생성됨'
        ANALYZING = 'analyzing', '분석중'
        ANALYSIS_READY = 'analysis_ready', '분석완료'
        ANALYSIS_CONFIRMED = 'analysis_confirmed', '분석확인됨'
        QUESTIONNAIRE_READY = 'questionnaire_ready', '질문지완료'
        DISTRIBUTING = 'distributing', '배포중'
        COLLECTING = 'collecting', '수집중'
        CLOSED = 'closed', '마감됨'
        AGGREGATING = 'aggregating', '취합중'
        AGGREGATION_READY = 'aggregation_ready', '취합완료'
        BRIEF_READY = 'brief_ready', '브리프완료'
        COMPLETED = 'completed', '완료'

    owner = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name='projects')
    project_type = models.CharField(max_length=10, choices=ProjectType.choices, default=ProjectType.UXUI)
    title = models.CharField(max_length=255)
    client_name = models.CharField(max_length=255)
    client_contact_email = models.EmailField(blank=True)
    client_contact_phone = models.CharField(max_length=20, blank=True)
    requirements_text = models.TextField()
    existing_site_url = models.URLField(blank=True, null=True)
    status = models.CharField(max_length=30, choices=Status.choices, default=Status.CREATED)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = 'projects_project'
        ordering = ['-created_at']

    def __str__(self):
        return f"{self.title} - {self.client_name}"


class ProjectMember(models.Model):
    """프로젝트 참여 멤버 — 역할 기반 접근 제어."""
    class Role(models.TextChoices):
        OWNER = 'owner', '소유자'
        ADMIN = 'admin', '관리자'
        EDITOR = 'editor', '편집자'
        VIEWER = 'viewer', '뷰어'

    project = models.ForeignKey(Project, on_delete=models.CASCADE, related_name='members')
    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name='project_memberships',
    )
    role = models.CharField(max_length=10, choices=Role.choices, default=Role.VIEWER)
    user_name = models.CharField(max_length=100, blank=True, help_text='비정규화 — 유저 삭제 후 이력 유지')
    user_email = models.EmailField(blank=True, help_text='비정규화 — 유저 삭제 후 이력 유지')
    invited_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True, blank=True,
        related_name='+',
    )
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = 'projects_projectmember'
        unique_together = [('project', 'user')]
        ordering = ['role', 'created_at']

    def __str__(self):
        return f'{self.user_name or self.user_email} ({self.get_role_display()}) - {self.project}'

    def save(self, *args, **kwargs):
        if self.user_id and not self.user_name:
            self.user_name = self.user.first_name or self.user.username or ''
        if self.user_id and not self.user_email:
            self.user_email = self.user.email or ''
        super().save(*args, **kwargs)


class ProjectDepartment(models.Model):
    """Team/department structure defined at project level."""
    project = models.ForeignKey(Project, on_delete=models.CASCADE, related_name='departments')
    name = models.CharField(max_length=100)
    order = models.PositiveIntegerField(default=0)

    class Meta:
        db_table = 'projects_projectdepartment'
        ordering = ['order']

    def __str__(self):
        return self.name


class ProjectPosition(models.Model):
    """Position/role structure defined at project level, with weight for aggregation."""
    project = models.ForeignKey(Project, on_delete=models.CASCADE, related_name='positions')
    name = models.CharField(max_length=100)
    weight = models.FloatField(default=1.0, help_text='취합 시 가중치 (1.0=기본, 2.0=2배 중요)')
    order = models.PositiveIntegerField(default=0)

    class Meta:
        db_table = 'projects_projectposition'
        ordering = ['order']

    def __str__(self):
        return self.name


class ReferenceSite(models.Model):
    project = models.ForeignKey(Project, on_delete=models.CASCADE, related_name='reference_sites')
    url = models.URLField()
    title = models.CharField(max_length=255, blank=True)
    description = models.TextField(blank=True)
    screenshot_path = models.CharField(max_length=500, blank=True)
    crawl_data = models.JSONField(default=dict, blank=True)
    order = models.PositiveIntegerField(default=0)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = 'projects_referencesite'
        ordering = ['order']

    def __str__(self):
        return f"{self.title or self.url}"


class ProjectFile(models.Model):
    """Files uploaded for project requirements (PDF, DOCX, images, etc.)."""
    project = models.ForeignKey(Project, on_delete=models.CASCADE, related_name='files')
    file = models.FileField(upload_to='project_files/%Y/%m/')
    original_name = models.CharField(max_length=255)
    file_type = models.CharField(max_length=50, blank=True)
    file_size = models.PositiveIntegerField(default=0)
    extracted_text = models.TextField(blank=True)
    ai_summary = models.TextField(blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = 'projects_projectfile'
        ordering = ['-created_at']

    def __str__(self):
        return self.original_name


class ProjectActivity(models.Model):
    """작업 히스토리 — 누가 무엇을 했는지 기록."""
    project = models.ForeignKey(Project, on_delete=models.CASCADE, related_name='activities')
    user_id = models.IntegerField(null=True, blank=True, help_text='작업자 User ID (참고용, FK 아님)')
    user_name = models.CharField(max_length=100, blank=True, help_text='작업자 이름 (퇴사해도 유지)')
    action = models.CharField(max_length=100, help_text='액션 코드 (e.g., analysis_triggered)')
    detail = models.JSONField(default=dict, blank=True, help_text='부가 정보')
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = 'projects_projectactivity'
        ordering = ['-created_at']

    def __str__(self):
        return f'{self.user_name}: {self.action}'


def log_activity(project, user, action: str, detail: dict | None = None):
    """프로젝트 활동 기록 유틸."""
    ProjectActivity.objects.create(
        project=project,
        user_id=user.id if user else None,
        user_name=getattr(user, 'first_name', '') or getattr(user, 'username', '') or str(user),
        action=action,
        detail=detail or {},
    )
