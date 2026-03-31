# SI 인터뷰 관리 시스템 - 프로젝트 정보

## 프로젝트 개요
SI(System Integration) 회사에서 클라이언트 UXUI 디자인 전 단계로 임직원 인터뷰를 관리하는 웹 애플리케이션.

## 비즈니스 워크플로우
1. **프로젝트 생성** — 클라이언트 정보, 요구사항, 기존 사이트 URL, 레퍼런스 사이트 등록
2. **AI 사이트 분석** — Claude/Gemini API로 클라이언트 요구사항 + 사이트들 자동 분석 (AI 선택 가능)
3. **유저 컨펌** — AI 분석 결과를 유저가 검토/수정 후 확인 (확인 후 잠금)
4. **AI 질문지 생성** — 확인된 분석 결과 기반으로 직급별 인터뷰 질문지 자동 생성 (중요도 + 의도 포함)
5. **질문지 편집/확정** — 유저가 순서 변경, 내용 수정, 직접 추가, AI 추가 생성 가능. 확정 시 잠금
6. **배포** — 임직원 정보 입력 → 일회용 URL 생성 (비밀번호: 폰번호 뒷4자리 또는 랜덤) → 이메일 발송, 개별 링크 관리/재생성
7. **응답 수집** — 온라인 설문 (부분 답변 허용) + 대면 인터뷰 수동 입력, 수집 마감
8. **AI 취합** — 모든 응답을 AI로 종합 분석 → 회사 방향성, 가치, 키워드, 핵심 문장 추출
9. **키워드/문장 편집** — 유저가 AI 추출 결과를 추가생성, 재생성, 수정 가능
10. **디자인 브리프** — 취합 결과를 디자인 브리프로 컴파일, 브랜드 키 컬러 설정
11. **DESIGN.md 생성** — AI로 Stitch 호환 디자인 시스템 명세서 생성 (다운로드 가능)
12. **Google Stitch 디자인 생성** — DESIGN.md 기반 1차 디자인 자동 생성, Stitch 웹 링크 제공, 결과 가져오기

## 기술 스택

| 구분 | 기술 |
|------|------|
| **백엔드** | Django 5 + Django REST Framework |
| **데이터베이스** | PostgreSQL 16 |
| **프론트엔드** | React 18 + TypeScript + Vite |
| **CSS** | TailwindCSS (다크/라이트 모드 지원) |
| **상태관리** | Zustand (auth/theme) + TanStack Query (서버 상태) |
| **비동기 작업** | Celery + Redis |
| **AI** | Anthropic Claude API + Google Gemini API (선택 가능, 기본 Claude) |
| **디자인 생성** | Google Stitch SDK (@google/stitch-sdk) via Node.js 브릿지 |
| **인프라** | Docker Compose + Nginx |
| **인증** | JWT (djangorestframework-simplejwt), 추후 SSO 추가 예정 |
| **테스트** | pytest (백엔드), vitest (프론트엔드) |

## 디렉토리 구조 (주요)
```
interview_tool/
├── docker-compose.yml
├── .env / .env.example
├── backend/
│   ├── Dockerfile
│   ├── requirements.txt
│   ├── manage.py
│   ├── config/              # Django 설정 (base/dev/prod/test)
│   ├── apps/
│   │   ├── accounts/        # 유저 인증
│   │   ├── projects/        # 프로젝트 관리, 12단계 상태
│   │   ├── analysis/        # AI 사이트 분석 (ai_provider 선택)
│   │   ├── questionnaires/  # 질문지 관리 (중요도, 의도, 확정 잠금)
│   │   ├── distribution/    # 직원 관리, 초대 링크 생성/재생성, 이메일 발송
│   │   ├── responses/       # 응답 수집, 수동 입력, 수집 마감
│   │   ├── aggregation/     # AI 취합, 키워드/문장 추출
│   │   └── design_brief/    # 디자인 브리프, DESIGN.md 생성, Stitch 연동
│   └── services/
│       ├── ai_client.py         # AI 팩토리 (Claude/Gemini 선택)
│       ├── claude_client.py     # Anthropic Claude API 래퍼
│       ├── gemini_client.py     # Google Gemini API 래퍼
│       ├── stitch_client.py     # Stitch Bridge HTTP 클라이언트
│       ├── crawler_service.py   # 웹 크롤링
│       ├── screenshot_service.py # 스크린샷
│       └── email_service.py     # 이메일 발송
├── frontend/
│   ├── Dockerfile
│   ├── src/
│   │   ├── api/             # Axios API 클라이언트
│   │   ├── components/      # layout/ + common/ (AiProviderSelect 포함)
│   │   ├── hooks/           # TanStack Query 커스텀 훅
│   │   ├── pages/           # 14개 페이지 컴포넌트
│   │   ├── routes/          # React Router 설정
│   │   ├── store/           # Zustand 스토어
│   │   ├── types/           # TypeScript 타입 정의
│   │   └── utils/           # 상수, 포매터, 유효성 검사
│   └── tailwind.config.ts
├── stitch-bridge/           # Node.js Stitch SDK 브릿지
│   ├── Dockerfile
│   ├── package.json         # @google/stitch-sdk 포함
│   └── src/
│       ├── index.ts         # Express 서버 (/generate, /project/:id/screens, /tools)
│       └── stitch.ts        # SDK 연동 (2단계: 생성 + 결과조회)
└── nginx/                   # 리버스 프록시 설정
```

## API 엔드포인트 요약

### 인증
- `POST /api/v1/auth/login/` — JWT 로그인

### 프로젝트
- `GET/POST /api/v1/projects/` — 프로젝트 목록/생성

### 분석
- `POST /api/v1/projects/{id}/analysis/trigger/` — AI 분석 시작 (ai_provider 선택)
- `POST /api/v1/projects/{id}/analysis/confirm/` — 분석 확인

### 질문지
- `POST /api/v1/projects/{id}/questionnaire/generate/` — AI 질문지 생성 (ai_provider 선택)
- `POST /api/v1/projects/{id}/questionnaire/confirm/` — 질문지 확정 (잠금)
- `GET /api/v1/projects/{id}/questionnaire/status/` — 생성 상태 폴링
- `POST /api/v1/projects/{id}/questionnaire/questions/reorder/` — 질문 순서 변경

### 배포
- `POST /api/v1/projects/{id}/invitations/generate/` — 설문 초대 링크 생성
- `POST /api/v1/projects/{id}/invitations/send/` — 이메일 발송
- `POST /api/v1/projects/{id}/invitations/{empId}/regenerate/` — 초대 링크 재생성

### 설문 (공개)
- `GET /api/v1/survey/{token}/` — 설문 정보
- `POST /api/v1/survey/{token}/verify/` — 비밀번호 확인 → JWT 발급
- `GET /api/v1/survey/{token}/questions/` — 질문 조회
- `POST /api/v1/survey/{token}/submit/` — 설문 제출 (부분 답변 허용)

### 응답/수동입력
- `GET /api/v1/projects/{id}/responses/` — 응답 목록
- `POST /api/v1/projects/{id}/responses/close/` — 수집 마감
- `POST /api/v1/projects/{id}/manual-entry/start/` — 수동입력 시작
- `POST /api/v1/projects/{id}/manual-entry/submit/` — 수동입력 제출

### 취합
- `POST /api/v1/projects/{id}/aggregation/trigger/` — AI 취합 시작
- `GET /api/v1/projects/{id}/aggregation/status/` — 취합 상태 폴링

### 디자인 브리프
- `POST /api/v1/projects/{id}/design-brief/compile/` — 취합 결과로 브리프 생성
- `POST /api/v1/projects/{id}/design-brief/design-md/generate/` — DESIGN.md 생성
- `GET /api/v1/projects/{id}/design-brief/design-md/download/` — DESIGN.md 다운로드
- `POST /api/v1/projects/{id}/design-brief/stitch/generate/` — Stitch 디자인 생성
- `POST /api/v1/projects/{id}/design-brief/stitch/{genId}/fetch/` — Stitch 결과 가져오기

## 보안
- **JWT 인증**: Access Token 30분, Refresh Token 7일
- **설문 URL 보안**: UUID v4 토큰 (추측 불가), bcrypt 비밀번호 해싱
- **설문 비밀번호**: 휴대폰 번호 뒷 4자리 → bcrypt 해시 저장 (번호 없으면 랜덤 4자리)
- **설문 세션**: 비밀번호 확인 후 30분짜리 단기 JWT 발급
- **Rate Limiting**: 로그인/비밀번호 확인 5회/분 제한
- **CORS**: 프론트엔드 오리진만 허용

## Docker 서비스 구성
| 서비스 | 포트 | 설명 |
|--------|------|------|
| db | 5432 | PostgreSQL 16 |
| redis | 6379 | Celery 브로커 + 캐시 |
| backend | 8000 | Django + Gunicorn |
| celery_worker | - | 비동기 AI 태스크 처리 |
| celery_beat | - | 주기적 태스크 (만료 체크 등) |
| frontend | 3000 | React + Vite dev server |
| stitch_bridge | 3001 | Node.js Stitch SDK 브릿지 |
| nginx | 80 | 리버스 프록시 |
