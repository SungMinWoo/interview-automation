# Interview Tool

UX/UI·BX 디자인 프로젝트의 착수 단계에서 진행하는 **클라이언트 임직원 인터뷰**를 한곳에서 관리하는 웹 애플리케이션입니다.
요구사항 분석 → 질문지 작성 → 설문 배포 → 응답 수집 → 결과 취합 → 디자인 브리프 작성까지의 흐름을 AI(Claude / Gemini)로 자동화합니다.

## 주요 기능

| 단계 | 내용 |
|------|------|
| **1. 프로젝트 생성** | 클라이언트 정보, 요구사항, 요구사항 파일(PDF/DOCX/TXT), 기존·레퍼런스 사이트 URL 등록 |
| **2. AI 분석** | 사이트 크롤링 + 요구사항 파일을 AI로 분석. 섹션별 재생성·수동 수정 후 확정 |
| **3. 질문지 생성** | 분석 결과 기반으로 섹션별 질문 자동 생성 (중요도·질문 의도·대상 부서/직급 포함). 편집·순서 변경·이전 프로젝트 질문지 불러오기 지원 |
| **4. 배포** | 임직원별 일회용 설문 링크 생성 + 이메일 발송. 링크 재생성·만료 관리 |
| **5. 응답 수집** | 온라인 설문(임시저장, 부분 응답 허용) + 대면 인터뷰 수동 입력 |
| **6. AI 취합** | 전체 응답을 직급 가중치를 반영해 종합. 파트별 요약, 키워드·핵심 문장 추출 및 편집 |
| **7. 디자인 브리프** | 취합 결과로 브리프 작성 → Stitch 호환 `DESIGN.md` 생성 → Google Stitch로 1차 디자인 시안 생성 |

그 밖의 기능:

- **프로젝트 멤버·권한**: Owner / Admin / Editor / Viewer 4단계 역할. 멤버가 아니면 프로젝트에 접근할 수 없음
- **인앱 알림**: 분석 완료, 질문지 확정, 수집 마감 같은 단계 변화를 프로젝트 멤버에게 알림
- **독립 도구**: 프로젝트를 만들지 않고 사이트 URL이나 파일만으로 AI 분석
- **AI 공급자 선택**: 작업마다 Claude 또는 Gemini 선택 (기본값 Claude)
- **다크 모드** 지원

## 아키텍처

```
                ┌──────────────┐
  Browser ────▶ │    Nginx     │  /api/* → backend, 그 외 → frontend
                └──────┬───────┘
          ┌────────────┴────────────┐
          ▼                         ▼
   ┌─────────────┐          ┌──────────────┐
   │  Frontend   │          │   Backend    │──▶ PostgreSQL
   │ React+Vite  │          │ Django + DRF │──▶ Redis ──▶ Celery worker / beat
   └─────────────┘          └──────┬───────┘          (AI 분석·취합·이메일 등 비동기 작업)
                                   │
                    ┌──────────────┼──────────────┐
                    ▼              ▼              ▼
              Claude API      Gemini API    Stitch Bridge (Node.js)
                                                  └──▶ Google Stitch SDK
```

## 기술 스택

| 구분 | 기술 |
|------|------|
| Backend | Python 3.12, Django 5.1, Django REST Framework, SimpleJWT |
| 비동기 작업 | Celery 5, Redis 7, django-celery-beat |
| Database | PostgreSQL 16 |
| Frontend | React 18, TypeScript, Vite 6, TailwindCSS, TanStack Query, Zustand |
| AI | Anthropic Claude API, Google Gemini API |
| 디자인 생성 | Google Stitch SDK (`stitch-bridge` Node.js 서비스) |
| 크롤링·파싱 | Playwright, BeautifulSoup, pypdf, python-docx |
| 인증 | 이메일·비밀번호 회원가입/로그인 + JWT (SimpleJWT) |
| 인프라 | Docker Compose, Nginx, Let's Encrypt |
| 테스트 | pytest, Vitest |

## 디렉터리 구조

```
.
├── backend/                 # Django API 서버
│   ├── config/              # 설정 (settings/base·development·production·test), Celery
│   ├── apps/
│   │   ├── accounts/        # 회원가입·로그인, 사용자 관리
│   │   ├── projects/        # 프로젝트, 멤버·권한, 부서/직급, 파일, 활동 이력
│   │   ├── analysis/        # AI 사이트·요구사항 분석
│   │   ├── questionnaires/  # 질문지 섹션·질문
│   │   ├── distribution/    # 임직원, 설문 초대 링크, 공개 설문 API
│   │   ├── responses/       # 응답 수집, 대면 인터뷰 수동 입력
│   │   ├── aggregation/     # AI 취합, 키워드·문장 추출
│   │   ├── design_brief/    # 디자인 브리프, DESIGN.md, Stitch 연동
│   │   ├── notifications/   # 인앱 알림
│   │   └── tools/           # 프로젝트 없이 쓰는 독립 분석 도구
│   └── services/            # AI 클라이언트, 크롤러, 파일 추출, 이메일
├── frontend/                # React SPA
├── stitch-bridge/           # Google Stitch SDK를 감싼 Express 서버
├── nginx/                   # 리버스 프록시 설정
├── docker-compose.yml
└── .env.example
```

## 시작하기

### 사전 준비

- Docker, Docker Compose
- AI API 키: Anthropic 또는 Google Gemini 중 하나 이상

### 1. 환경 변수 설정

```bash
cp .env.example .env
```

`.env`에서 최소한 아래 값을 채웁니다.

| 변수 | 설명 |
|------|------|
| `DJANGO_SECRET_KEY` | Django 시크릿 키. **설정하지 않으면 서버가 기동하지 않습니다** |
| `ANTHROPIC_API_KEY` / `GEMINI_API_KEY` | 사용할 AI 공급자의 API 키 |
| `DEFAULT_AI_PROVIDER` | `claude` 또는 `gemini` |
| `STITCH_API_KEY` | Google Stitch 키. 없으면 stitch-bridge가 **Mock 모드**로 동작해 샘플 HTML을 돌려줍니다 |
| `EMAIL_*` | 설문 초대 메일 발송용 SMTP. 개발 중에는 `EMAIL_BACKEND=django.core.mail.backends.console.EmailBackend`로 콘솔 출력 가능 |

그 밖의 변수(DB, Redis, 설문 링크 만료일 등)는 `.env.example`의 주석을 참고하세요.

### 2. 실행

```bash
docker compose up -d --build
```

백엔드 컨테이너가 기동하면서 마이그레이션을 자동으로 적용합니다. http://localhost:3000 에서 회원가입하면 바로 사용할 수 있습니다.

| 서비스 | 주소 |
|--------|------|
| Frontend | http://localhost:3000 |
| Backend API | http://localhost:8000/api/v1/ |
| Stitch Bridge | http://localhost:3001/health |

> `nginx` 서비스는 HTTPS 설정(`nginx/conf.d/default.conf`)을 쓰기 때문에, 로컬에서는 frontend·backend에 직접 접속하세요. 설정에 들어 있는 `interview.example.com`은 예시 도메인이므로 배포할 때 실제 도메인으로 바꿔야 합니다.

### 3. 더미 데이터 (선택)

프로젝트 단계별 샘플 데이터를 생성합니다.

```bash
docker compose exec backend python manage.py seed_data            # 전체 단계
docker compose exec backend python manage.py seed_data --stage questionnaire_ready
docker compose exec backend python manage.py seed_data --flush    # 기존 더미 데이터 삭제 후 재생성
```

더미 데이터에는 고정 비밀번호를 쓰는 관리자·테스트 계정(`admin@example.com`, `test@example.com`)이 함께 생성됩니다. **로컬 개발용**이므로 운영 환경에서는 실행하지 마세요.

## 인증

- 이메일·비밀번호로 회원가입하고 로그인합니다. 비밀번호는 Django 비밀번호 검증기(최소 길이, 흔한 비밀번호, 숫자로만 된 비밀번호 차단 등)를 통과해야 합니다.
- 로그인하면 JWT(Access 30분 / Refresh 7일, 회전·블랙리스트 적용)를 발급합니다.
- 로그인은 IP당 분당 10회, 회원가입은 분당 5회로 제한합니다.
- 사이트 관리자(`is_staff`)는 사용자 관리 화면에서 계정 활성화와 관리자 권한을 관리합니다. 첫 관리자는 `python manage.py createsuperuser`로 만듭니다.
- Django Admin은 URL에 등록되어 있지 않고, Nginx에서도 `/admin/`을 차단합니다.

### 설문 응답자 인증

임직원은 로그인 없이 초대 링크로 설문에 참여합니다.

- 링크마다 추측할 수 없는 UUID 토큰이 붙고, 만료일(`SURVEY_URL_EXPIRY_DAYS`)이 있습니다.
- 4자리 비밀번호(휴대폰 번호 뒷자리 또는 랜덤)는 bcrypt로 저장합니다. 검증 요청은 분당 5회로 제한합니다.
- 비밀번호를 확인하면 30분짜리 설문 전용 토큰을 발급합니다.

## 테스트

```bash
# Backend (PostgreSQL이 localhost:5432에 떠 있어야 합니다. config/settings/test.py 참고)
cd backend
pytest

# Frontend
cd frontend
npm install
npx vite build
```

> 프론트엔드에는 아직 테스트 파일이 없습니다. 기존 코드에 TypeScript 타입 오류가 남아 있어 `npm run build`(`tsc -b && vite build`)는 현재 실패하며, 번들 생성은 `npx vite build`로 확인할 수 있습니다.

## 배포

`.github/workflows/deploy.yml`은 `main` 브랜치에 push되면 SSH로 서버에 접속해 최신 코드를 받고 `docker compose up -d --build`를 실행합니다. 필요한 GitHub Secrets는 `DEPLOY_HOST`, `DEPLOY_USER`, `DEPLOY_SSH_KEY`, `DEPLOY_PATH`, (선택) `DEPLOY_PORT`입니다.

SSL 인증서는 `init-letsencrypt.sh`로 처음 발급하고, `renew-cert.sh`를 cron에 등록해 갱신합니다. `init-letsencrypt.sh`의 `DOMAIN`, `EMAIL` 값은 배포 환경에 맞게 수정해야 합니다.

운영 환경에서는 다음을 확인하세요.

- `DJANGO_SETTINGS_MODULE=config.settings.production`으로 설정 (기본값은 `development`이며 `DEBUG=True`, `ALLOWED_HOSTS=*`)
- `DJANGO_ALLOWED_HOSTS`, `CORS_ALLOWED_ORIGINS`를 실제 도메인으로 제한
- PostgreSQL(5432), Redis(6379) 포트가 외부에 열리지 않도록 방화벽 설정
