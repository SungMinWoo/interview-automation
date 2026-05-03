# 세션 변경 이력 (2026-05-03 ~ 05-04)

## 프로젝트 멤버 관리 시스템

### 모델: `ProjectMember` (projects 앱)
- `project` FK, `user` FK, `role` (owner/admin/editor/viewer)
- `user_name`, `user_email`: 비정규화 필드 (유저 삭제 후에도 이력 유지)
- `invited_by` FK (SET_NULL)
- `unique_together = (project, user)`
- 마이그레이션 `0006_add_projectmember`, `0007_backfill_owner_members` (기존 owner → OWNER 멤버 자동 생성)

### 역할 기반 권한 매트릭스
| 행동 | Owner | Admin | Editor | Viewer |
|------|:---:|:---:|:---:|:---:|
| 프로젝트/데이터 조회 | O | O | O | O |
| 콘텐츠 편집 (분석, 질문지, 배포 등) | O | O | O | X |
| 멤버 추가/삭제/역할 변경 | O | O | X | X |
| 프로젝트 삭제 | O | X | X | X |
| 소유권 이전 | O | X | X | X |

### 퍼미션 클래스 (`accounts/permissions.py`)
- `IsProjectMember` — 모든 멤버
- `IsProjectEditor` — editor 이상
- `IsProjectAdmin` — admin 이상
- `IsProjectOwner` — owner만

### 접근 제어 (`projects/access.py`)
- `get_accessible_project(request, project_id)` — 멤버 확인 후 반환, 아니면 403
- `ProjectViewSet.get_queryset` → `members__user=request.user` 필터 (자신이 멤버인 프로젝트만)
- 6개 앱(analysis, questionnaires, distribution, responses, aggregation, design_brief)의 `get_user_project` → `get_accessible_project` 교체

### 멤버 관리 API
- `GET/POST /api/v1/projects/{id}/members/` — 목록/추가 (admin+)
- `PATCH /api/v1/projects/{id}/members/{mid}/` — 역할 변경 (admin+)
- `DELETE /api/v1/projects/{id}/members/{mid}/` — 제거 (admin+, owner 제거 불가)
- `POST /api/v1/projects/{id}/transfer-ownership/` — 소유권 이전 (owner만)

### 프론트엔드
- `types/member.ts` — ProjectMember, MemberRole 타입
- `api/members.ts` — API 클라이언트
- `hooks/useMembers.ts` — useMembers, useAddMember, useUpdateMemberRole, useRemoveMember, useTransferOwnership, useSearchUsers
- `ProjectDetailPage.tsx` — 멤버 관리 카드 (목록, 역할 뱃지, 역할 변경 셀렉트, 제거, 소유권 이전 모달)
- `utils/constants.ts` — MEMBER_ROLE_LABELS, MEMBER_ROLE_COLORS, ASSIGNABLE_ROLES, API_PATHS 추가

---

## 유저 삭제 대비

### pre_delete 시그널 (`projects/signals.py`)
- User 삭제 전 소유 프로젝트 소유권 자동 이전 (admin → editor → viewer 순)
- 다른 멤버가 없으면 프로젝트 삭제
- `projects/apps.py` 생성 → 시그널 등록

### 기존 안전 장치
- `ProjectActivity` — `user_id`(IntegerField) + `user_name`(CharField)으로 FK 없이 저장 → 삭제 영향 없음
- `Notification` — `actor_id`(IntegerField) + `actor_name`(CharField) 동일 패턴

---

## 알림 시스템 (notifications 앱 신규)

### 모델: `Notification`
- `recipient` FK → User (CASCADE), `project` FK → Project (CASCADE, nullable)
- `event_type`: 13종 (status_changed, member_added/removed/role_changed, analysis_completed/confirmed, questionnaire_ready/confirmed, invitations_sent, collection_closed, aggregation_completed, brief_ready, ownership_transferred)
- `title`, `message`, `detail` (JSONField)
- `actor_id`, `actor_name`: 비정규화
- `is_read`, `read_at`
- 인덱스: `(recipient, is_read, -created_at)`

### 알림 생성 서비스 (`notifications/services.py`)
- `notify_project_members()` — 멤버에게 `bulk_create`, 행위자 본인 제외

### Celery 태스크 (`notifications/tasks.py`)
- `create_project_notifications.delay(project_id, event_type, title, ...)` — 비동기 생성

### 알림 트리거 위치 (기존 `log_activity` 옆에 추가)
| 파일 | 이벤트 |
|------|--------|
| `analysis/tasks.py` | analysis_completed |
| `analysis/views.py` | analysis_confirmed |
| `questionnaires/tasks.py` | questionnaire_ready |
| `questionnaires/views.py` | questionnaire_confirmed |
| `distribution/views.py` | invitations_sent |
| `responses/views.py` | collection_closed |
| `aggregation/tasks.py` | aggregation_completed |
| `design_brief/views.py` | brief_ready |
| `projects/views.py` | member_added, member_removed, member_role_changed, ownership_transferred |

### 알림 API
- `GET /api/v1/notifications/` — 목록 (is_read, project 필터)
- `GET /api/v1/notifications/unread-count/` — 미읽음 수
- `POST /api/v1/notifications/{id}/read/` — 단건 읽음
- `POST /api/v1/notifications/read-all/` — 전체 읽음

### 프론트엔드
- `types/notification.ts` — Notification 타입
- `api/notifications.ts` — API 클라이언트
- `hooks/useNotifications.ts` — useNotifications, useUnreadCount (30초 폴링), useMarkAsRead, useMarkAllAsRead
- `components/layout/NotificationBell.tsx` — 벨 아이콘 + 미읽음 뱃지 + 드롭다운 알림 목록
- `Header.tsx` — 기존 정적 벨 버튼 → NotificationBell 컴포넌트로 교체

---

## 유저 검색 API

### 백엔드
- `GET /api/v1/auth/users/search/?q=keyword` — 이메일, username, 이름, 회사명으로 검색 (1글자 이상, 본인 제외, 최대 10건)
- `UserSearchSerializer`, `UserSearchView` (`accounts/serializers.py`, `accounts/views.py`)

### 프론트엔드
- `types/auth.ts` — `UserSearchResult` 타입 추가
- `api/auth.ts` — `searchUsers()` 함수 추가
- `hooks/useMembers.ts` — `useSearchUsers(query)` 훅 추가
- `ProjectDetailPage.tsx` — 멤버 추가 시 이메일 직접 입력 → **유저 검색 자동완성 드롭다운**으로 교체 (아바타, 이름, 이메일 표시, 이미 멤버인 유저 자동 제외, 바깥 클릭 시 닫힘)

---

## 테스트 유저 추가

### 마이그레이션 `accounts/migrations/0003_add_test_users.py`
- 이미 존재하면 스킵 (`get_or_create` 패턴)
- 비밀번호 공통: `[REMOVED]`

| 이름 | 이메일 | username |
|------|--------|----------|
| 김민지 | kim.designer@example.com | kim_designer |
| 이준혁 | lee.pm@example.com | lee_pm |
| 박서연 | park.dev@example.com | park_dev |
| 최유진 | choi.ux@example.com | choi_ux |
| 정태호 | jung.analyst@example.com | jung_analyst |

---

## 파일 변경 요약

### 신규 파일 (백엔드)
- `apps/notifications/` — 앱 전체 (models, views, serializers, urls, services, tasks, admin, apps, migrations)
- `apps/projects/access.py` — 중앙 접근 제어
- `apps/projects/apps.py` — AppConfig + 시그널 등록
- `apps/projects/signals.py` — 유저 삭제 시그널
- `apps/projects/migrations/0006_add_projectmember.py`
- `apps/projects/migrations/0007_backfill_owner_members.py`
- `apps/accounts/migrations/0003_add_test_users.py`

### 신규 파일 (프론트엔드)
- `types/member.ts`, `types/notification.ts`
- `api/members.ts`, `api/notifications.ts`
- `hooks/useMembers.ts`, `hooks/useNotifications.ts`
- `components/layout/NotificationBell.tsx`

### 수정 파일 (백엔드)
- `apps/projects/models.py` — ProjectMember 모델
- `apps/projects/serializers.py` — 멤버 시리얼라이저 4개
- `apps/projects/views.py` — 멤버 관리 뷰, get_queryset 필터, 접근 제어
- `apps/projects/urls.py` — 멤버/소유권이전 URL
- `apps/projects/admin.py` — ProjectMember 어드민
- `apps/accounts/permissions.py` — 역할 기반 퍼미션 4개
- `apps/accounts/views.py` — UserSearchView
- `apps/accounts/serializers.py` — UserSearchSerializer
- `apps/accounts/urls.py` — 유저 검색 URL
- `config/settings/base.py` — notifications 앱 등록
- `config/urls.py` — notifications URL
- 6개 앱 views.py — get_user_project → get_accessible_project + 알림 트리거
- 4개 tasks.py — 알림 트리거 추가

### 수정 파일 (프론트엔드)
- `utils/constants.ts` — API_PATHS, 역할 라벨/색상
- `components/layout/Header.tsx` — NotificationBell 적용
- `components/layout/index.ts` — export 추가
- `pages/ProjectDetailPage.tsx` — 멤버 관리 UI + 유저 검색 자동완성
- `types/auth.ts` — UserSearchResult
- `api/auth.ts` — searchUsers
