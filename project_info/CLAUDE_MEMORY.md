# Claude Memory Backup

이 파일은 Claude Code의 내부 메모리(.claude/projects/.../memory/)에 저장된 내용의 백업입니다.
세션이 끊겨도 이 파일을 참고하면 프로젝트 컨텍스트를 빠르게 복원할 수 있습니다.

---

## MEMORY.md (인덱스)
- [Project Overview](project_overview.md) — SI 인터뷰 관리 시스템, Django+React, AI(Gemini)+Stitch 통합

---

## project_overview.md

**name**: Interview Site Project Overview
**description**: SI company interview management system - Django+React full-stack app for UXUI design process
**type**: project

SI 회사의 UXUI 디자인 전 임직원 인터뷰 관리 웹 앱.

**Workflow**: 프로젝트 생성 -> AI 사이트분석 (Gemini) -> 유저 컨펌 -> AI 질문지 생성 -> 배포 (일회용 URL, 비밀번호=폰뒷4자리) -> 응답수집 (온라인+대면) -> AI 취합 -> 키워드/문장 추출 -> Google Stitch 디자인 생성

**Tech Stack**: Django 5 + DRF, PostgreSQL, React 18 + TypeScript + Vite, TailwindCSS (다크모드), Celery + Redis, Google Gemini API, Stitch Bridge (Node.js), Docker Compose, Nginx

**Why:** 기존에 질문지를 수작업으로 작성/배포하는 프로세스가 오래 걸려서 AI 자동화 + 웹 배포로 개선

**How to apply:** AI 결과물에는 항상 유저 수정/컨펌 단계가 필요. SSO는 나중에 추가 예정.

---

## 핵심 설계 결정 (새 세션에서 참고)

1. **URL 파라미터**: 모든 nested URL에서 `project_id` 사용 (project_pk 아님)
2. **AI 결과물 수정**: 분석, 질문지, 취합 모든 단계에서 유저 수정/컨펌 필수
3. **Celery 태스크**: AI 작업(분석/질문지생성/취합/Stitch)은 모두 shared_task + 재시도 3회
4. **설문 보안**: UUID v4 토큰 + bcrypt(폰뒷4자리) + PyJWT 30분 세션
5. **프론트 라우팅**: createBrowserRouter + RouterProvider (BrowserRouter 아님)
6. **상태관리**: Zustand(auth/theme) + TanStack Query(서버상태), Redux 사용 안 함
7. **Stitch 통합**: Node.js 마이크로서비스 브릿지, 현재 Mock 구현, SDK 연동 시 코드 교체만 필요
8. **다크모드**: TailwindCSS `dark:` 클래스 + html 태그 class 토글
