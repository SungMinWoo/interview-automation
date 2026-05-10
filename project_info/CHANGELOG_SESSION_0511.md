# 세션 변경 이력 (2026-05-10 ~ 05-11)

피드백 반영 — **"소유주 위주 화면" → 역할별 차별화된 UX**, 헤더/사이드바 정리, 양방향 dropdown 호환성 버그 수정.

---

## 1. 프로젝트 리스트 — 역할/소유자 가시성

### 백엔드 (`projects/serializers.py`, `views.py`)
- `ProjectListSerializer`에 신규 필드 3개 추가
  - `my_role`: 현재 로그인 유저의 이 프로젝트 내 역할 (`owner`/`admin`/`editor`/`viewer`/null)
  - `owner_name`: OWNER 멤버의 표시 이름
  - `owner_email`: OWNER 멤버의 이메일
- `ProjectViewSet.get_queryset` — `select_related('owner')` + `Prefetch('members', ...)` 추가로 N+1 방지 (list action에만 적용)

### 프론트엔드
- `types/project.ts` — `Project` 타입에 `my_role`, `owner_name`, `owner_email` 추가
- `pages/ProjectListPage.tsx`
  - 카드 우상단에 **상태 뱃지 + 내 역할 뱃지** (소유자/관리자/편집자/뷰어, 색상 매핑은 `MEMBER_ROLE_COLORS` 재사용)
  - 카드 하단에 **Crown 아이콘 + 소유자 이름** 표시
  - 탭(uxui/bx) 상태를 URL `?tab=` 쿼리 파라미터와 동기화 → 프로젝트 상세 진입 후 뒤로가기 시 탭 유지 (`useSearchParams`, `replace: true`)

---

## 2. RoleBanner 공통 컴포넌트 (신규)

### `components/common/RoleBanner.tsx`
역할별로 가시성을 다르게 표시:

| 역할 | 표시 형태 | 의도 |
|------|----------|------|
| **viewer** | 큰 배너 + "읽기 전용 모드 (뷰어)" + View only 라벨 + 설명 | 권한 한계 즉시 인지 |
| **owner/admin/editor** | 작은 인라인 칩 + 가능한 작업 한 줄 요약 | 정보 제공, 방해하지 않음 |
| **사이트 관리자(멤버 아님)** | warning 색 배너 + "멤버는 아니지만 모든 권한으로 조회/관리" | 시스템 권한 명시 |

### 적용 위치
- `ProjectDetailPage` — 헤더 우측에 칩 (owner/admin/editor) 또는 헤더 아래 큰 배너 (viewer)
- 모든 파이프라인 페이지 (`AnalysisPage`, `QuestionnairePage`, `DistributionPage`, `AggregationPage`, `DesignBriefPage`, `ResponsesPage`) — 헤더 직후 자동 표시

---

## 3. 뷰어 UX 차별화 — "버튼 비활성" → "버튼 숨김 + 빈 상태 메시지 차별화"

### 기존 패턴 (제거)
- `disabled={!canEdit} title={editDisabledTitle}` — 회색 비활성 + 호버해야 보이는 툴팁
- 뷰어 입장에서는 "못 하는 버튼들로 가득한 화면"

### 신규 패턴
- 편집 액션 버튼은 `{canEdit && (...)}` 로 **완전히 숨김**
- 빈 상태 메시지를 권한별로 분기:
  - 편집자+: "AI 분석 시작" 버튼 + 설명
  - 뷰어: "아직 분석이 시작되지 않았습니다. 편집자 이상 권한이 있는 멤버가 시작하면 여기에 결과가 표시됩니다."

### 적용 페이지
| 페이지 | 변경 내용 |
|--------|----------|
| `ProjectDetailPage` | 파일 업로드 영역(canEdit 시만), 파일별 "AI 분석" 버튼 숨김, 진행 단계 스텝퍼 CTA "진행하기" → 뷰어용 "보기" |
| `AnalysisPage` | 트리거/확정/재분석 버튼 숨김, 빈 상태/실패 상태 분기 |
| `QuestionnairePage` | 액션 영역(`!lockEdit`) 유지 + 빈 상태 메시지 분기 |
| `DistributionPage` | 액션 영역 + 직원 추가/초대 생성 버튼 숨김, EmployeeCard에서 `editDisabledTitle` prop 제거 |
| `AggregationPage` | 트리거/재생성 버튼 숨김 + 뷰어용 빈 상태 |
| `DesignBriefPage` | 브리프 생성/수정/저장 + Stitch 디자인/결과가져오기/재생성 버튼 숨김 |
| `ResponsesPage` | 수집 마감 버튼 + 수동 입력 링크 숨김 |

### 클린업
- `editDisabledTitle` 변수 전부 제거 (7개 페이지)
- 사용하지 않게 된 disable+tooltip 패턴 일소

---

## 4. 대시보드 — 역할 컨텍스트 + CTA 재배치

### `pages/DashboardPage.tsx`
- **환영 영역**에 역할별 카운트 배지 라인 추가 (소유 N · 관리자 N · 편집자 N · 뷰어 N — 해당하는 역할만 노출)
- 환영 문구 분기:
  - 0개: "아직 참여 중인 프로젝트가 없습니다."
  - 뷰어 전용: "참여 중인 프로젝트가 N개 있습니다."
  - 그 외: 기본 "프로젝트 현황을 한눈에 확인하세요."

### 빠른 작업 CTA 재구성
- **메인 CTA → "내 프로젝트"** (강조 색상, 화살표, 진행 중 N개 표시)
  - 뷰어 전용 사용자에게는 라벨이 "참여 중인 프로젝트"로 변경
- **보조 CTA → "새 프로젝트"** (작아짐, 뷰어 전용 사용자에게는 opacity 0.7로 약화)
  - 기존: 두 카드가 동등한 비중 → 변경: 메인/보조 위계 명확
- 의도: 뷰어/편집자가 들어와도 "참여 중인 프로젝트로 가기"가 메인 액션이 되도록 — 더 이상 "새 프로젝트"가 가장 큰 버튼이 아님

### 최근 프로젝트
- 각 항목에 내 역할 미니 배지 추가 (소유자에는 Crown, 뷰어에는 Eye 아이콘)
- 빈 상태 메시지 보강 — "다른 멤버가 추가해주길 기다려보세요"

---

## 5. 헤더 (`components/layout/Header.tsx`) 정리

### 유저 메뉴 개선
- 아바타: 하드코딩된 `"U"` → 실제 로그인 유저의 이름 첫 글자 (first_name → username → email 순 fallback)
- **사이트 관리자 표시**: 아바타 우하단에 작은 Shield 배지 + 드롭다운 본문에 "사이트 관리자" 칩
- 드롭다운 헤더에 사용자 정보 영역 추가 (큰 아바타 + 이름 + 이메일)
- **데드 메뉴 제거**: onClick 핸들러 없이 작동 안 하던 "프로필", "설정" 메뉴 → 완전 제거. 드롭다운에 "사용자 정보 + 로그아웃"만 남김

### Breadcrumbs 라벨 매핑 강화
- 기존: `dashboard`, `projects`, `settings` 3개만 매핑
- 신규: `tools`, `users`, `new`, `analysis`, `questionnaire`, `distribution`, `responses`, `manual`, `aggregation`, `design-brief` 추가
- **프로젝트 ID(숫자) → 실제 프로젝트 제목 자동 치환**
  - `홈 > 프로젝트 > 123 > analysis` → `홈 > 프로젝트 > [실제 제목] > AI 분석`
  - `useProject(id)` 훅을 `ProjectTitleSegment` 서브 컴포넌트에서 호출 — TanStack Query 캐시 공유로 **추가 API 요청 없음**
  - 미로딩 시 `#123` 임시 표시
- 매핑되지 않은 숫자 세그먼트는 `#숫자` 표기로 영문 그대로 노출 방지
- `overflow-hidden` + `truncate` 추가로 긴 프로젝트명도 깨지지 않음

---

## 6. NotificationBell — Headless UI Popover로 전환 (버그 수정)

### 문제
- 알림 버튼 누른 후 유저 메뉴를 누르면 알림 dropdown이 닫히지 않음
- 반대 방향(유저 메뉴 → 알림)은 정상

### 원인
- NotificationBell이 자체 outside-click 감지 (`useState` + `useRef` + `document.addEventListener('mousedown')`) 사용
- Headless UI의 Menu 버튼이 mousedown 이벤트의 propagation을 막아 document까지 도달 안 함
- capture phase(`true`)로 등록해도 환경에 따라 fragile

### 해결
- NotificationBell을 **Headless UI Popover**로 완전 전환
- `useState` / `useRef` / `useEffect` (outside click 핸들러) 전부 제거
- 두 dropdown이 같은 라이브러리(Headless UI)의 outside-click 메커니즘을 공유 → 한쪽이 열리면 다른 쪽이 자동으로 닫힘
- 알림 항목 클릭 시 자동 닫기는 PopoverPanel의 render prop `close` 함수 사용
- 부수 효과: ESC 키 닫기, focus 관리 등 접근성 자동 향상

---

## 파일 변경 요약

### 신규 파일 (프론트엔드)
- `components/common/RoleBanner.tsx` — 역할별 배너/칩 컴포넌트

### 수정 파일 (백엔드)
- `apps/projects/serializers.py` — `ProjectListSerializer`에 my_role/owner_name/owner_email 추가
- `apps/projects/views.py` — `ProjectViewSet.get_queryset`에 select_related/Prefetch 추가

### 수정 파일 (프론트엔드)
- `types/project.ts` — Project 타입에 my_role/owner_name/owner_email 필드
- `components/common/index.ts` — RoleBanner export 추가
- `components/layout/Header.tsx` — 유저 메뉴 개선, Breadcrumbs 라벨 매핑 강화, 프로젝트 제목 자동 치환
- `components/layout/NotificationBell.tsx` — Headless UI Popover로 전환
- `pages/DashboardPage.tsx` — 역할 카운트 배지, CTA 재배치, 최근 프로젝트 역할 배지
- `pages/ProjectListPage.tsx` — 역할/소유자 표시, 탭 URL 동기화
- `pages/ProjectDetailPage.tsx` — RoleBanner, 뷰어용 파일 업로드 빈 상태, 진행 스텝퍼 CTA 분기
- `pages/AnalysisPage.tsx` — RoleBanner, 트리거/확정 버튼 숨김, 뷰어용 빈 상태
- `pages/QuestionnairePage.tsx` — RoleBanner, 빈 상태 메시지 분기, editDisabledTitle 제거
- `pages/DistributionPage.tsx` — RoleBanner, 액션 영역 canEdit 가드, EmployeeCard prop 정리
- `pages/AggregationPage.tsx` — RoleBanner, 트리거/재생성 버튼 숨김, 뷰어용 빈 상태
- `pages/DesignBriefPage.tsx` — RoleBanner, 브리프/Stitch 액션 숨김
- `pages/ResponsesPage.tsx` — RoleBanner, 수집 마감/수동 입력 숨김

---

## 핵심 설계 원칙 (이번 세션의 takeaway)

1. **권한 차이는 한눈에 보여야 한다** — 진입 직후 상단 배너로 즉시 인지
2. **"못 하는 액션을 회색으로 보여주기"는 나쁜 패턴** — 숨기고, 빈 상태에 권한별 적절한 메시지를 넣어라
3. **CTA 위계는 사용자 컨텍스트에 따라 달라져야 한다** — 뷰어한테 "새 프로젝트"가 메인 CTA여서는 안 됨
4. **자체 outside-click 감지는 다른 라이브러리와 충돌한다** — 같은 페이지에서 여러 dropdown을 쓰면 같은 메커니즘(Headless UI 등)으로 통일하는 게 안전
