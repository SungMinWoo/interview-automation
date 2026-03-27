# 구현 완료 요약

## 백엔드 (Django + DRF)

### 앱 구성 (8개)
| 앱 | 모델 | 주요 기능 |
|----|------|----------|
| **accounts** | User | 이메일 기반 로그인, JWT 인증, 프로필 관리 |
| **projects** | Project, ReferenceSite | 프로젝트 CRUD, 레퍼런스 사이트 관리, 12단계 상태 관리 |
| **analysis** | SiteAnalysis, ProjectAnalysis | AI 사이트 분석, 유저 수정/컨펌, 상태 폴링 |
| **questionnaires** | Questionnaire, PositionCategory, Question | AI 질문지 생성, 직급별 분류, 드래그앤드롭 순서변경 |
| **distribution** | Employee, SurveyInvitation | 직원 관리, 일회용 URL 생성, bcrypt 비밀번호, 이메일 발송 |
| **responses** | SurveyResponse, Answer | 온라인 응답 수집, 대면 인터뷰 수동 입력, 수집 마감 |
| **aggregation** | Aggregation, ExtractedKeyword, ExtractedSentence | AI 취합, 키워드/문장 추출, 버전 관리, 유저 수정 |
| **design_brief** | DesignBrief, StitchGeneration | 디자인 브리프 컴파일, Stitch 디자인 생성 |

### 서비스 레이어
| 서비스 | 파일 | 기능 |
|--------|------|------|
| **GeminiClient** | `services/gemini_client.py` | Gemini API 래퍼 - 분석, 질문지 생성, 취합, 키워드 추가생성, Stitch 프롬프트 생성 |
| **ScreenshotService** | `services/screenshot_service.py` | Playwright 기반 웹사이트 스크린샷 캡처 |
| **CrawlerService** | `services/crawler_service.py` | httpx + BeautifulSoup 웹 크롤링 |
| **EmailService** | `services/email_service.py` | 설문 초대 이메일 발송 (한국어 HTML 템플릿) |
| **StitchClient** | `services/stitch_client.py` | Stitch Bridge HTTP 통신 클라이언트 |

### Celery 비동기 태스크 (4개)
| 태스크 | 앱 | 기능 |
|--------|-----|------|
| `run_project_analysis` | analysis | 사이트 크롤링 + Gemini 분석 (재시도 3회) |
| `generate_questionnaire` | questionnaires | Gemini 질문지 생성 + DB 저장 |
| `run_aggregation` | aggregation | 전체 응답 취합 + 키워드/문장 추출 |
| `run_stitch_generation` | design_brief | Stitch Bridge 디자인 생성 |

### 공개 설문 시스템
- **URL**: `/api/v1/survey/{uuid}/` — UUID v4 토큰 (추측 불가)
- **비밀번호**: 폰번호 뒷4자리 → bcrypt 해싱 → 검증 후 30분 JWT 발급
- **기능**: 설문 정보 조회, 비밀번호 확인, 질문 조회 (직급별 필터), 자동 임시저장, 제출

---

## 프론트엔드 (React + TypeScript + Vite)

### 페이지 (14개)
| 페이지 | 경로 | 기능 |
|--------|------|------|
| **LoginPage** | `/login` | 이메일/비밀번호 로그인 + 회원가입 |
| **DashboardPage** | `/dashboard` | 프로젝트 현황, 통계 카드, 빠른 실행 |
| **ProjectListPage** | `/projects` | 프로젝트 그리드, 상태 필터, 검색 |
| **ProjectCreatePage** | `/projects/new` | 프로젝트 생성 폼 (zod 유효성 검사) |
| **ProjectDetailPage** | `/projects/:id` | 6단계 프로그레스 스테퍼, 프로젝트 정보 |
| **AnalysisPage** | `.../analysis` | AI 분석 실행/폴링, 결과 인라인 편집, 확인 |
| **QuestionnairePage** | `.../questionnaire` | dnd-kit 드래그앤드롭, 질문 CRUD, 직급 필터 |
| **DistributionPage** | `.../distribution` | 직원 관리 테이블, 초대 링크 생성, 이메일 발송 |
| **ResponsesPage** | `.../responses` | 응답 현황 그리드, 진행률 바, 수집 마감 |
| **ManualEntryPage** | `.../manual/:empId` | 대면 인터뷰 답변 수동 입력 |
| **AggregationPage** | `.../aggregation` | AI 취합, 키워드 태그 편집, 문장 편집, 재생성 |
| **DesignBriefPage** | `.../design-brief` | 브리프 편집, Stitch 생성, iframe 미리보기 |
| **SurveyPage** | `/survey/:token` | 공개 설문 (비밀번호 → 질문 → 제출 → 감사) |
| **NotFoundPage** | `*` | 404 페이지 |

### 공통 컴포넌트
- **Layout**: AppLayout, Sidebar (접이식), Header (브레드크럼, 유저메뉴), ThemeToggle
- **Common**: Button, Input, Modal, LoadingSpinner, StatusBadge, ConfirmDialog, DataTable, EmptyState

### 상태관리
- **Zustand**: authStore (JWT 토큰, 유저 정보), themeStore (다크/라이트 모드)
- **TanStack Query**: 모든 서버 상태 (캐싱, 폴링, Optimistic Updates)

### 검증
- TypeScript 컴파일: **에러 0개**
- Vite 빌드: **성공** (673KB JS, 36KB CSS)

---

## Google Stitch 통합

### 아키텍처
```
Django Backend → HTTP → Stitch Bridge (Node.js/Express) → @google/stitch-sdk → Google Stitch API
```

### 현재 상태
- Mock 구현 포함 (기본 HTML 생성)
- 실제 SDK 연동 시 `stitch-bridge/src/stitch.ts` 의 주석 해제만 하면 됨
- Stitch SDK가 Node.js 전용이라 별도 마이크로서비스로 분리

---

## 인프라

### Docker Compose 서비스 (8개)
PostgreSQL, Redis, Django Backend, Celery Worker, Celery Beat, React Frontend, Stitch Bridge, Nginx

### 시작 방법
```bash
cp .env.example .env
# .env에서 GEMINI_API_KEY 등 API 키 설정
docker compose up --build
```

### 접속
- 프론트엔드: http://localhost:3000 (또는 Nginx: http://localhost:80)
- 백엔드 API: http://localhost:8000/api/v1/
- Django Admin: http://localhost:8000/admin/

---

## 테스트

### 백엔드
- 프레임워크: pytest + pytest-django + factory-boy
- 위치: 각 앱의 `tests/` 디렉토리
- 실행: `cd backend && pytest --cov`

### 프론트엔드
- 프레임워크: vitest + @testing-library/react + MSW
- 설정: `src/test/setup.ts`
- 실행: `cd frontend && npm test`

---

## 향후 작업
- [ ] SSO 인증 연동
- [ ] Google Stitch 실제 SDK 연동 (@google/stitch-sdk 설치)
- [ ] Playwright 스크린샷 서비스 Docker 설정
- [ ] 프론트엔드 코드 스플리팅 (dynamic import)
- [ ] E2E 테스트 (Playwright)
- [ ] 프로덕션 배포 설정 (SSL, 도메인 등)
