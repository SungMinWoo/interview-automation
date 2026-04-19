# Claude Memory Backup

이 파일은 Claude Code의 내부 메모리(.claude/projects/.../memory/)에 저장된 내용의 백업입니다.
세션이 끊겨도 이 파일을 참고하면 프로젝트 컨텍스트를 빠르게 복원할 수 있습니다.

---

## project_overview.md

**name**: Interview Site Project Overview
**description**: SI company interview management system - Django+React full-stack app for UXUI design process
**type**: project

SI 회사의 UXUI 디자인 전 임직원 인터뷰 관리 웹 앱.

**Workflow**: 프로젝트 생성 → AI 사이트분석 (Claude/Gemini 선택) → 유저 컨펌 → AI 질문지 생성 (중요도/의도 포함) → 질문지 확정(잠금) → 배포 (개별 초대링크, 비밀번호=폰뒷4자리 또는 랜덤) → 응답수집 (온라인+대면, 부분답변 허용) → 수집 마감 → AI 취합 → 키워드/문장 추출 → 디자인 브리프 컴파일 → DESIGN.md 생성 → Google Stitch 디자인 생성

**Tech Stack**: Django 5 + DRF, PostgreSQL, React 18 + TypeScript + Vite, TailwindCSS (다크모드), Celery + Redis, Anthropic Claude API + Google Gemini API (선택 가능), Google Stitch SDK (@google/stitch-sdk) via Node.js Bridge, Docker Compose, Nginx

**Why:** 기존에 질문지를 수작업으로 작성/배포하는 프로세스가 오래 걸려서 AI 자동화 + 웹 배포로 개선

**How to apply:** AI 결과물에는 항상 유저 수정/컨펌 단계가 필요. 각 단계 확정 후 이전 단계 보호(잠금).

---

## 핵심 설계 결정 (새 세션에서 참고)

1. **AI Provider 선택**: Claude(기본)/Gemini 선택 가능. `services/ai_client.py` 팩토리로 관리. 각 모델의 ai_provider 필드에 기록
2. **URL 파라미터**: 모든 nested URL에서 `project_id` 사용 (project_pk 아님)
3. **AI 결과물 수정**: 분석, 질문지, 취합 모든 단계에서 유저 수정/컨펌 필수
4. **단계별 잠금**: 분석 확인 → 질문지 확정(CONFIRMED → CRUD 차단) → 수집 마감 → 순서대로 진행
5. **Celery 태스크**: AI 작업(분석/질문지생성/취합)은 shared_task + 재시도 3회, Stitch는 재시도 0회
6. **설문 보안**: UUID v4 토큰 + bcrypt(폰뒷4자리 또는 랜덤) + PyJWT 30분 세션
7. **프론트 라우팅**: createBrowserRouter + RouterProvider
8. **상태관리**: Zustand(auth/theme) + TanStack Query(서버상태)
9. **Stitch 통합**: Node.js 브릿지 → @google/stitch-sdk 실제 연동. 2단계 (생성 + 결과조회). DESIGN.md를 prompt에 포함하여 전달
10. **다크모드**: TailwindCSS `dark:` 클래스 + html 태그 class 토글
11. **DRF 페이지네이션**: 전역 PageNumberPagination 설정. 프론트 hooks에서 flat/paginated 응답 모두 처리
12. **Question 중요도**: `importance` 필드가 IntegerChoices(1-5) → TextChoices('required'/'important'/'optional')로 변경. is_required 필드 삭제 → importance === 'required'로 대체
13. **DESIGN.md**: AI로 생성하여 DesignBrief.design_md에 저장. Stitch 생성 시 prompt에 포함 + create_design_system의 designMd 필드에도 전달
14. **Stitch callTool 파라미터**: camelCase 사용 (projectId, deviceType, prompt) — snake_case 아님
15. **질문지 구조**: 섹션(QuestionSection) 기반 — 초기 AI 전체 생성 후, 섹션별 AI 추가 생성(count 지정, `sections/{id}/generate/`). section에 importance(상/중/하), target_area(공통 등), target_positions(M2M). 질문에 sub_category(세부구분), section FK, options(JSONField, 선택지), target_departments/target_positions(M2M) 포함. 질문 수정 시 선택지 추가/삭제 + 대상 부서/직급 토글 설정 가능
16. **프로젝트 구조**: ProjectDepartment(부서), ProjectPosition(직급+weight가중치) — 프로젝트별 독립 관리. 배포 시 직원 등록에 드롭다운으로 연동
17. **파일 업로드**: ProjectFile 모델 + file_extractor 서비스(pypdf, python-docx). 업로드 시 자동 텍스트 추출 → AI 분석(analyze_file_content) 가능
18. **취합 개선**: 직급별 가중치(ProjectPosition.order 기반), 파트별 요약(section_summaries), 카테고리별 변화사항(desired_changes), 원문 워딩 보존(sentences에 '화자: 원문' 형태)
19. **폴링 패턴**: 수동 isPolling useState 제거 → `shouldPoll = data?.status === 'processing'`으로 자동 관리 (새로고침 시에도 자동 폴링 재개)
20. **설문 질문 필터링**: section.target_positions → question.target_positions → question.target_departments 순서로 체크 (비어있으면 모든 대상)
21. **초대 링크 생성 제한**: 질문지가 CONFIRMED 상태여야만 초대 링크 생성 가능 (백엔드 GenerateInvitationsView + 프론트 DistributionPage 양쪽에서 체크)
22. **AI 질문 생성 흐름**: 초기에만 상단 "AI 질문지 생성" 버튼 표시 (전체 섹션+질문 한번에 생성). 이후에는 각 섹션의 "AI 추가" 버튼으로 해당 섹션에만 질문 추가 (1~10개 지정)
23. **QuestionSerializer M2M 필드**: PrimaryKeyRelatedField를 `queryset=[]`로 선언하면 `list.get()` 에러 발생. 반드시 `__init__`에서 필드 자체를 재생성해야 함 (`self.fields['target_departments'] = PrimaryKeyRelatedField(...)`)
24. **QuestionnaireSerializer.questions**: `section__isnull=True`로 필터하여 섹션 없는 질문만 반환 (섹션 소속 질문은 sections → questions 중첩으로 제공, 중복 방지)
25. **분석에 요구사항 파일 포함**: `run_project_analysis` 태스크에서 ProjectFile의 extracted_text/ai_summary를 수집하여 AI 프롬프트에 `file_contents` 파라미터로 전달. analyze_project() 시그니처에 `file_contents: list[dict] | None = None` 추가
26. **분석 섹션별 재생성**: `POST analysis/regenerate-section/` — section 파라미터(requirements_summary/existing_site_analysis/reference_sites_analysis/combined_insights)로 특정 섹션만 AI 재생성. 확인(confirmed) 상태에서는 불가. `regenerate_analysis_section()` 메서드가 Claude/Gemini 클라이언트에 추가됨
27. **프로젝트 생성 시 파일 첨부**: ProjectCreatePage에서 파일을 선택(pendingFiles 상태)하면, 프로젝트 생성 후 순차적으로 파일 업로드 API 호출
28. **ProjectFileSerializer**: original_name, file_type, file_size는 read_only (perform_create에서 서버가 설정)
29. **LoginPage**: 회원가입 폼 제거됨 — 로그인만 가능
30. **Header 로그아웃**: useAuth().logout + navigate('/login') — onClick 핸들러 연결됨
31. **seed_data**: 현재 모델 구조에 맞게 전면 재작성 — ProjectDepartment/ProjectPosition/QuestionSection/ProjectActivity 포함, importance 문자열, is_required 제거, section_summaries/categorized desired_changes, 질문지 확정(distributing 이상), 문장에 화자 포함, 단계별 활동 기록(타임스탬프 역순)
32. **프로젝트 전체 공개**: 모든 앱의 `get_user_project`에서 `owner=request.user` 필터 제거. ProjectViewSet.get_queryset → `Project.objects.all()`. owner는 생성자 기록용으로만 유지. 같은 회사 전제
33. **작업 히스토리 (ProjectActivity)**: project FK + user_id(IntegerField, FK 아님) + user_name(CharField) + action + detail(JSONField) + created_at. `log_activity(project, user, action, detail)` 유틸 함수. 퇴사/SSO 전환 대비 FK 없이 값 저장
34. **Activity 기록 위치**: analysis(trigger/confirm/section_regenerated), questionnaire(generate/confirm/import), distribution(invitations_generated), responses(collection_closed), aggregation(trigger). 각 뷰에서 `log_activity()` 호출
35. **Activity API**: `GET /projects/{id}/activities/` — 최근 50건. ProjectDetailPage 하단에 타임라인 UI (아바타+이름+한국어 액션 라벨+상대시간)
36. **이전 질문지 불러오기**: `GET questionnaire/templates/` (다른 프로젝트 질문지 목록), `POST questionnaire/import/` (source_project_id로 섹션+질문 복사). 프론트에 모달 UI
37. **이전 질문지 참고 AI 생성**: generate 요청 시 reference_project_ids 파라미터. Celery 태스크에서 참고 질문지 구조를 AI 프롬프트에 포함 ("구조만 참고, 그대로 복사 금지")

---

## 프론트엔드 ↔ 백엔드 필드명 규칙

**백엔드(DRF)**: snake_case (employee_name, ai_provider, design_md 등)
**프론트엔드**: 백엔드 snake_case를 그대로 사용 (camelCase 변환 없음)
- `analysis.ai_provider`, `aggregation.company_direction`, `brief.design_md` 등
- 타입 정의에서 snake_case 사용

---

## 백엔드 URL 매핑 (주의)

| 프론트 상수 | 백엔드 실제 URL |
|---|---|
| `BRIEF` | `/projects/{id}/design-brief/` (brief 아님!) |
| `STITCH_GENERATE` | `/projects/{id}/design-brief/stitch/generate/` |
| `STITCH_LIST` | `/projects/{id}/design-brief/stitch/` |
| `MANUAL_ENTRY_START` | `/projects/{id}/manual-entry/start/` (responses/manual 아님!) |
| `PROJECT_ACTIVITIES` | `/projects/{id}/activities/` |
| `ANALYSIS_REGENERATE_SECTION` | `/projects/{id}/analysis/regenerate-section/` |
| `AGGREGATION_TRIGGER` | `/projects/{id}/aggregation/trigger/` |
| `QUESTIONNAIRE_SECTIONS` | `/projects/{id}/questionnaire/sections/` |
| `QUESTIONNAIRE_SECTION` | `/projects/{id}/questionnaire/sections/{sectionId}/` |
| `QUESTIONNAIRE_SECTION_GENERATE` | `/projects/{id}/questionnaire/sections/{sectionId}/generate/` |
| `DEPARTMENTS` | `/projects/{id}/departments/` |
| `POSITIONS` | `/projects/{id}/positions/` |
| `PROJECT_FILES` | `/projects/{id}/files/` |
| `PROJECT_FILE_ANALYZE` | `/projects/{id}/files/{fileId}/analyze/` |
| `QUESTIONNAIRE_TEMPLATES` | `/projects/{id}/questionnaire/templates/` |
| `QUESTIONNAIRE_IMPORT` | `/projects/{id}/questionnaire/import/` |
