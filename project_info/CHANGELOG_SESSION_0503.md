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

### 알림 발송 시점 상세 (언제 누구에게 가는가)

**공통 규칙**
- 수신자: 해당 프로젝트의 모든 멤버 (owner/admin/editor/viewer 전원)
- **행위자(actor) 본인은 항상 제외** (`exclude_user_id`로 필터)
- AI 비동기 완료 알림은 행위자 ID 없이 모든 멤버에게 발송
- 알림 본문(title)에 표시되는 사람 이름은 `user_name` 우선, 없으면 `user_email`

**프로젝트 플로우 단계별**

| 시점 | 이벤트 타입 | title 예시 | 트리거 위치 |
|------|------------|-----------|------------|
| AI 분석 작업이 비동기로 끝났을 때 | `analysis_completed` | "{프로젝트} — 분석이 완료되었습니다" | `analysis/tasks.py:103` (Celery) |
| 사용자가 분석 결과를 확정했을 때 | `analysis_confirmed` | "{프로젝트} — 분석이 확인되었습니다" | `analysis/views.py:115` (AnalysisConfirmView) |
| AI 질문지 생성이 비동기로 끝났을 때 | `questionnaire_ready` | "{프로젝트} — 질문지가 준비되었습니다" | `questionnaires/tasks.py:139` (Celery) |
| 사용자가 질문지를 확정했을 때 | `questionnaire_confirmed` | "{프로젝트} — 질문지가 확정되었습니다" | `questionnaires/views.py:102` (QuestionnaireConfirmView) |
| 설문 초대 링크가 일괄 생성됐을 때 | `invitations_sent` | "{프로젝트} — 설문 초대가 생성되었습니다 (N명)" | `distribution/views.py:130` (GenerateInvitationsView) |
| 응답 수집이 마감됐을 때 | `collection_closed` | "{프로젝트} — 응답 수집이 마감되었습니다" | `responses/views.py:86` (CloseCollectionView) |
| AI 취합 작업이 비동기로 끝났을 때 | `aggregation_completed` | "{프로젝트} — 취합이 완료되었습니다" | `aggregation/tasks.py:119` (Celery) |
| 프로젝트가 완료 처리됐을 때 | `brief_ready` | "{프로젝트} — 프로젝트가 완료되었습니다" | `design_brief/views.py:329` (CompleteProjectView) |

> 참고: 질문지 1차 AI 생성과 분석 1차 AI 생성은 트리거 시점이 아니라 **백그라운드 작업이 끝났을 때** 알림이 발송됩니다 (Celery `tasks.py`). 즉, 사용자가 "AI 분석 시작"을 누른 직후에는 알림이 가지 않고, AI가 실제로 결과를 만들어내고 나서 발송됩니다.

**멤버 관리 이벤트** (`projects/views.py`)

| 시점 | 이벤트 타입 | title 예시 | 라인 |
|------|------------|-----------|------|
| 새 멤버가 추가됐을 때 | `member_added` | "{프로젝트} — {이름}님이 멤버로 추가되었습니다" | `projects/views.py:266` |
| 기존 멤버의 역할이 변경됐을 때 | `member_role_changed` | "{프로젝트} — {이름}님의 역할이 변경되었습니다" | `projects/views.py:301` |
| 멤버가 프로젝트에서 제거됐을 때 | `member_removed` | "{프로젝트} — {이름}님이 프로젝트에서 제거되었습니다" | `projects/views.py:328` |
| 소유권이 다른 사람에게 이전됐을 때 | `ownership_transferred` | "{프로젝트} — 소유권이 {이름}님에게 이전되었습니다" | `projects/views.py:381` |

> `member_*` 이벤트는 행위자(보통 admin)를 제외하고 발송되므로, **작업을 한 본인은 자기 알림을 받지 않습니다**. `ownership_transferred`만 예외적으로 `exclude_user_id`가 빠져 있어 새 owner가 자기 알림도 받게 됩니다 (의도된 동작).

**알림이 가지 않는 액션 (의도적)**
- 분석/질문지 트리거 시점 (작업 시작만으로는 알림 X — 완료 시점에 발송)
- AI 섹션 재생성, 키워드/문장 추가·삭제, 직원 추가, 단건 초대 재발송, 수동 입력 제출 등 **국지적 편집 작업**
- Stitch 디자인 생성/재생성/screenshot fetch

**프론트 표시 위치**
- `components/layout/NotificationBell.tsx` — 헤더 벨 아이콘 (미읽음 뱃지, 30초 폴링)
- `actor_name` (사람 이름)이 본문 아래 한 줄로 표시됨 (이메일 아님)

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
