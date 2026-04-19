# 세션 변경 이력 (2026-04-14 ~ 04-20)

## 질문지 관리 개선

### 용어 통일 + 섹션 CRUD
- "파트" → "섹션"으로 용어 통일
- 섹션 추가/삭제 기능 구현 (삭제 시 확인 단계 포함)
- 각 섹션마다 "AI 추가" 버튼 — 1~10개 질문 수 지정하여 해당 섹션에만 AI 질문 추가 생성
- 백엔드: `POST sections/{id}/generate/` API, `generate_section_questions()` 메서드 (Claude/Gemini)

### AI 생성 흐름 변경
- 상단 "AI 추가 생성" 버튼 제거
- 초기에만 "AI 질문지 생성" 버튼 표시 (질문 0개일 때)
- 이후에는 각 섹션의 "AI 추가" 버튼으로 개별 추가

### 질문 수정 기능 강화
- 단일선택/복수선택 타입일 때 선택지(options) 추가/삭제 UI
- 질문별 대상 부서/직급 토글 설정 (ProjectDepartment/ProjectPosition M2M)
- QuestionUpdateRequest에 options, target_departments, target_positions 필드 추가
- QuestionSerializer에서 M2M PrimaryKeyRelatedField를 `__init__`에서 재생성 (queryset=[] 에러 방지)

### 이전 질문지 불러오기/참고 생성
- `GET questionnaire/templates/` — 다른 프로젝트의 질문지 목록 (섹션/질문 수 포함)
- `POST questionnaire/import/` — source_project_id로 섹션+질문 전체 복사
- AI 생성 시 `reference_project_ids` 파라미터 — 이전 질문지 구조를 AI 프롬프트에 참고로 포함
- 프론트: "불러오기" 모달 + "이전 질문지 참고하여 AI 생성" 체크박스 (최대 3개 선택)

### QuestionnaireSerializer 중복 방지
- `questions` 필드를 SerializerMethodField로 변경 — `section__isnull=True`로 필터하여 섹션 없는 질문만 반환
- ManualEntryPage에서 sections[].questions + unsectioned questions 합쳐서 표시하도록 수정

---

## 분석 페이지 개선

### AI 분석에 요구사항 파일 포함
- `run_project_analysis` 태스크에서 ProjectFile의 extracted_text/ai_summary 수집하여 AI 프롬프트에 포함
- `analyze_project()` 시그니처에 `file_contents: list[dict] | None = None` 추가 (Claude/Gemini 모두)

### 섹션별 개별 AI 재생성
- `POST analysis/regenerate-section/` API — section 파라미터로 특정 섹션만 AI 재생성
- 가능한 섹션: requirements_summary, existing_site_analysis, reference_sites_analysis, combined_insights
- `regenerate_analysis_section()` 메서드 Claude/Gemini에 추가
- 프론트: 각 섹션에 "AI 재생성" 버튼, 상단에는 "전체 재분석" + "분석 확인"만 유지

---

## 배포 관리 — 질문지 확정 필수

### 백엔드
- `GenerateInvitationsView`에 질문지 CONFIRMED 상태 체크 추가 (미확정 시 400 에러)

### 프론트
- 전체 초대 링크 생성 버튼 → 미확정 시 "질문지 확정 후 초대 링크를 생성할 수 있습니다" 안내
- 개별 직원 카드 → 미확정 시 생성 버튼 대신 안내 텍스트

---

## 프로젝트 전체 공개 + 작업 히스토리

### 전체 공개
- 모든 앱의 `get_user_project`에서 `owner=request.user` 필터 제거
- `ProjectViewSet.get_queryset` → `Project.objects.all()`
- owner는 생성자 기록용으로만 유지 (같은 회사 전제)

### ProjectActivity 모델
- `project` FK + `user_id` IntegerField + `user_name` CharField + `action` + `detail` JSONField + `created_at`
- FK 없이 user_id/user_name을 값으로 저장 (퇴사/SSO 전환 대비)
- `log_activity(project, user, action, detail)` 유틸 함수

### 기록되는 액션
- `project_created` — 프로젝트 생성
- `analysis_triggered` / `analysis_confirmed` / `analysis_section_regenerated` — 분석
- `questionnaire_generate_triggered` / `questionnaire_confirmed` / `questionnaire_imported` — 질문지
- `invitations_generated` — 초대 링크 생성
- `collection_closed` — 수집 마감
- `aggregation_triggered` — 취합

### API + 프론트
- `GET /projects/{id}/activities/` — 최근 50건
- ProjectDetailPage 하단에 타임라인 UI (아바타 + 이름 + 한국어 액션 라벨 + 상대시간)
- 7일 이내: 상대시간 (방금 전/N분 전/N시간 전/N일 전)
- 7일 초과: `YYYY.MM.DD HH:mm` 형식

---

## 독립 도구 (tools 앱)

### 백엔드
- 새 앱 `apps/tools` 생성
- `POST /api/v1/tools/analyze-site/` — URL → 크롤링 + AI 분석 (전용 `analyze_site()` 메서드)
- `POST /api/v1/tools/analyze-file/` — 파일 업로드 → 텍스트 추출 + AI 분석
- 기존 CrawlerService/file_extractor/AI 클라이언트를 프로젝트 의존 없이 호출

### 프론트
- 사이드바에 "도구" 메뉴 추가 (`/tools`)
- ToolsPage에 탭 구성: 사이트 분석 / 파일 분석
- 사이트 분석: URL 입력 → 크롤링 정보 + AI 분석 결과
- 파일 분석: 드래그앤드롭 → AI 분석 결과 + "텍스트 복사"/"마크다운 복사" 버튼

---

## 프로젝트 생성 개선
- ProjectCreatePage에 요구사항 파일 첨부 영역 추가
- 프로젝트 생성 후 순차적으로 파일 업로드 API 호출

---

## UI/UX 개선

### 로그인 페이지
- 회원가입 폼/버튼 완전 제거 — 로그인만 가능

### 로그아웃
- Header에 `useAuth().logout` + `navigate('/login')` onClick 핸들러 연결

### 프로젝트 상세 페이지 상단
- 프로젝트 정보를 카드 형태로 정리 (상태 뱃지 + 클라이언트 정보 + 기존 사이트 URL + 요구사항 + 레퍼런스 태그)

### select 텍스트 색상
- QuestionnairePage의 모든 select 요소에 `text-content-primary` 추가 (다크모드 글자 안 보이던 문제)

### 글자 넘침 방지
- `index.css`에 글로벌 `overflow-wrap: break-word; word-break: break-word;` 적용

### 디자인 브리프 톤앤무드
- JSON stringify 표시 → 키별 라벨+값으로 변환 (keywords는 태그 형태)

### 파일 목록
- 파일명 하단 extracted_text 미리보기 제거

### 크롤링 SSL 에러
- `httpx.get`에 `verify=False` 추가 (Docker 컨테이너 CA 인증서 문제)
- User-Agent를 실제 브라우저로 변경

---

## 미사용 코드 정리
- `registerSchema`, `RegisterFormValues`, `RegisterRequest` 삭제
- `useAuth.register()`, `authApi.register()` 삭제
- `usePositionCategories` 등 4개 훅 삭제
- `POSITION_CATEGORIES`, `POSITION_CATEGORY` API 상수 삭제
- `categoriesKey` 삭제

---

## seed_data 전면 재작성
- ProjectDepartment/ProjectPosition 생성
- QuestionSection 기반 질문 구조
- importance 문자열 (required/important/optional)
- is_required 필드 제거
- Aggregation: section_summaries + categorized desired_changes
- 질문지 확정 (distributing 이상)
- 핵심 문장에 화자 포함
- ProjectActivity 활동 기록 (단계별 타임스탬프)
- StitchGeneration 필드 수정 (screens_data → generated_html_content)

---

## 향후 작업으로 기록
- BX(브랜딩) 업무 지원 확장 — project_type(uxui/bx/integrated) 분기
- 독립 도구 확장 — 내부 설문(간단 버전), 데이터 취합 도구
- Playwright/E2E 테스트 항목 제거
