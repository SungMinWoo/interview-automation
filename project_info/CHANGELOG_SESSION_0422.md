# 세션 변경 이력 (2026-04-20 ~ 04-23)

## 디자인 시스템 색상 변경

### 다크 테마 배경색
- `--bg-primary`: `#161616` → `#1a1919`
- `--bg-secondary`: `#242424` → `black`
- `--bg-glass`: `rgba(15,15,15,.7)` → `rgba(26,25,25,.7)` (bg-primary 톤 맞춤)

### 라이트 테마 액센트
- `--accent-bg`: `#161616` → `#1a1919`
- `--accent-hover`: `#242424` → `black`

### 다크모드 input 글자색 수정
- `AggregationPage.tsx` 키워드/핵심문장 input에 `text-content-primary` + `placeholder-content-tertiary` 추가
- 전체 프로젝트 조사 결과 이 2개만 누락, 나머지 페이지는 정상

---

## AI 취합 페이지 개선

### 키워드/핵심문장 — AI vs 유저 구분
- 백엔드: `KeywordViewSet.perform_create`, `SentenceViewSet.perform_create`에 `is_user_added=True` 추가
- 프론트: AI 생성은 Sparkles 아이콘 / `AI` 뱃지, 유저 추가는 `+` 아이콘 / `직접 추가` 뱃지
- 키워드: AI는 배경 있음, 유저는 테두리만

### 유저 추가 시 메타데이터 입력
- 핵심문장: `문장` + `카테고리` 입력
- 키워드: `키워드` + `카테고리` + `가중치(0~1)` 입력
- 모두 선택 입력, 비워두면 없이 추가

### 질문별 요약 추가
- AI 프롬프트에 `question_summaries` 필드 추가 (Claude/Gemini 모두)
- `SectionSummary` 타입에 `question_summaries?: QuestionSummary[]` 추가
- 프론트: 파트별 요약과 질문별 요약을 별도 섹션으로 분리

### 전체 결과 복사 기능
- "텍스트 복사" / "마크다운 복사" 버튼 (결과 상단)
- 마크다운: 테이블, 인용구, 볼드 등 포맷 포함 — 노션/슬랙에 바로 붙여넣기 가능

---

## SSO 연동

### OAuth2 + PKCE 플로우
- SSO Provider(그룹웨어)와 연동
- `project_info/sso-client-example-master` 예제 기반 구현

### 백엔드
- `backend/services/sso.py` — 토큰 교환 + JWKS ID Token 검증
- `SSOTokenExchangeView` — POST `/api/v1/auth/sso/token/`
- User 모델에 `sso_id` 필드 추가 (마이그레이션 포함)
- SSO 유저 자동 생성 (email 기반 조회, 없으면 새 계정)
- `requirements.txt`에 `cryptography` 추가

### 프론트엔드
- `OAuthCallbackPage.tsx` — SSO 콜백 처리 (code 교환 → JWT 저장 → 대시보드)
- `LoginPage.tsx` — "그룹웨어 SSO 로그인" 버튼 + PKCE 생성 + Provider 리다이렉트
- SSO 미설정 시 기존 이메일/비밀번호 로그인만 표시

### 설정
- `.env`에 `OAUTH2_CLIENT_ID`, `OAUTH2_CLIENT_SECRET`, `OAUTH2_PROVIDER_URL`, `OAUTH2_REDIRECT_CALLBACK_URI` 추가
- 프론트: `VITE_SSO_PROVIDER_URL`, `VITE_SSO_CLIENT_ID`
- 기존 이메일/비밀번호 로그인 유지 (SSO 완전 전환 전까지)

---

## BX(브랜딩) 프로젝트 타입 지원

### Project 모델
- `ProjectType` choices: `uxui` (UX/UI), `bx` (BX)
- `project_type` 필드 추가 (default: `uxui`)
- 마이그레이션 `0005_project_project_type`

### AI 프롬프트 분기 (Claude/Gemini 8개 메서드)
| 메서드 | UX/UI | BX |
|--------|-------|-----|
| `analyze_project` | 사이트 UX/UI 분석 | 브랜드 포지셔닝/에셋/경쟁사 분석 |
| `generate_questionnaire` | UX/UI 인터뷰 질문 | 브랜드 인식/가치/퍼소나 질문 |
| `aggregate_responses` | tone/feature/value/emotion | identity/positioning/personality/value |
| `generate_additional_keywords` | 동일 카테고리 분기 | |
| `build_stitch_prompt` | 웹 디자인 프롬프트 | 브랜드 아이덴티티 디자인 |
| `generate_design_md` | 디자인 시스템 | 브랜드 가이드라인 |

### Task에서 project_type 전달
- `analysis/tasks.py`, `questionnaires/tasks.py`, `aggregation/tasks.py` — AI 호출 시 `project_type=project.project_type` 전달
- `analysis/views.py` (섹션 재생성), `design_brief/views.py` (DESIGN.md) — 동일

### 프론트엔드
- 프로젝트 생성: UX/UI | BX 토글 버튼
- 프로젝트 목록: **UX/UI | BX 탭으로 완전 분리** (각 탭에 프로젝트 수 뱃지)
- 프로젝트 상세: 상단에 타입 뱃지
- 디자인 브리프: BX일 때 "브랜드 전략 브리프" 타이틀
- 브리프 컴파일: BX일 때 "Brand Strategy Brief" 제목 자동 생성

### 더미데이터 (seed_data)
- 산더미 모터스 프로젝트를 BX 타입으로 변경
- BX 전용 데이터: 섹션 3개 (Brand Overview / Brand Identity / Competitive Landscape), 질문 8개
- BX 답변 샘플, 키워드 10개 (identity/positioning/personality/value), 핵심문장 6개
- BX 취합 데이터: 파트별/질문별 요약, 브랜드 전략 desired_changes
- BX 디자인 브리프: Brand Essence, Brand Personality, Tone of Voice

---

## 프로젝트 상태 전환 수정

### 빠진 전환 보완
- `aggregation_ready → brief_ready`: `CompileDesignBriefView`에서 브리프 컴파일 시 상태 전환 추가 (기존에는 Stitch 완료 시에만)
- `brief_ready → completed`: `CompleteProjectView` 신규 엔드포인트 (`POST /design-brief/complete/`)

### 프론트: 프로젝트 완료 버튼
- `DesignBriefPage`에 "프로젝트 완료" 버튼 (brief_ready 상태일 때만 표시)

### 전체 상태 전환 맵 (완성)
```
created → analyzing           분석 트리거 (analysis/tasks.py)
analyzing → analysis_ready     분석 태스크 완료
analysis_ready → analysis_confirmed  유저 확인 (analysis/views.py)
analysis_confirmed → questionnaire_ready  질문지 태스크 완료
questionnaire_ready → distributing  질문지 확정 (questionnaires/views.py)
distributing → collecting      초대 발송 (distribution/views.py)
collecting → closed            수집 마감 (responses/views.py)
closed → aggregating           취합 트리거 (aggregation/tasks.py)
aggregating → aggregation_ready  취합 태스크 완료
aggregation_ready → brief_ready  브리프 컴파일 (design_brief/views.py) ← 수정
brief_ready → completed        프로젝트 완료 (design_brief/views.py) ← 신규
```

---

## 프로젝트 목록 페이지 수정

### Pagination 비활성화
- `ProjectViewSet`에 `pagination_class = None` — 전체 프로젝트 반환
- DRF 기본 `PAGE_SIZE: 20`이 적용되어 20개 넘으면 상태 필터가 동작 안 하던 문제 해결
- `useProjects` 훅: 배열/페이지네이션 두 형태 모두 처리
- `DashboardPage` 동일 수정

### 탭 분리
- 기존 타입 필터 버튼 → UX/UI | BX 상단 탭으로 변경
- 각 탭에 프로젝트 수 뱃지
- 탭 전환 시 검색/상태 필터 초기화
- 카드에서 타입 뱃지 제거 (탭으로 구분되므로 불필요)

---

## 향후 작업
- 기존 이메일/비밀번호 로그인 제거 (SSO 완전 전환 후)
- 내부 설문도구 (독립 설문 생성/배포)
- BX 전용 브랜드 에셋 분석 도구
- `integrated` 프로젝트 타입 (UX/UI + BX 통합)
