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
| `AGGREGATION_TRIGGER` | `/projects/{id}/aggregation/trigger/` |
| `QUESTIONNAIRE_SECTIONS` | `/projects/{id}/questionnaire/sections/` |
| `QUESTIONNAIRE_SECTION` | `/projects/{id}/questionnaire/sections/{sectionId}/` |
| `QUESTIONNAIRE_SECTION_GENERATE` | `/projects/{id}/questionnaire/sections/{sectionId}/generate/` |
| `DEPARTMENTS` | `/projects/{id}/departments/` |
| `POSITIONS` | `/projects/{id}/positions/` |
| `PROJECT_FILES` | `/projects/{id}/files/` |
| `PROJECT_FILE_ANALYZE` | `/projects/{id}/files/{fileId}/analyze/` |
