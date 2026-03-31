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
12. **Question 필드**: importance(1-5 중요도), purpose(의도 설명) — AI 생성 시 포함, 취합/브리프에 활용
13. **DESIGN.md**: AI로 생성하여 DesignBrief.design_md에 저장. Stitch 생성 시 prompt에 포함 + create_design_system의 designMd 필드에도 전달
14. **Stitch callTool 파라미터**: camelCase 사용 (projectId, deviceType, prompt) — snake_case 아님

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
