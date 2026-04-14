# 구현 완료 요약

## 백엔드 (Django + DRF)

### 앱 구성 (8개)
| 앱 | 모델 | 주요 기능 |
|----|------|----------|
| **accounts** | User | 이메일 기반 로그인, JWT 인증, 프로필 관리 |
| **projects** | Project, ProjectDepartment, ProjectPosition, ProjectFile, ReferenceSite | 프로젝트 CRUD, 부서/직급 구조 관리, 요구사항 파일 업로드/AI분석, 레퍼런스 사이트 관리, 12단계 상태 관리 |
| **analysis** | SiteAnalysis, ProjectAnalysis (ai_provider) | AI 사이트 분석, 유저 수정/컨펌, 상태 폴링 |
| **questionnaires** | Questionnaire (status, ai_provider), QuestionSection (importance high/medium/low, target_area, target_positions), PositionCategory, Question (importance required/important/optional, sub_category, section FK, options JSONField, target_departments M2M, target_positions M2M) | AI 질문지 생성 (섹션 기반), 섹션별 AI 추가 생성 (count 지정), 질문 CRUD (선택지 편집, 대상 부서/직급 설정), 섹션/세부구분/중요도/의도 관리, 확정 잠금, 폴링 |
| **distribution** | Employee (phone optional), SurveyInvitation (survey_url) | 직원 관리, 개별 초대 링크 생성/재생성 (**질문지 확정 필수**), bcrypt 비밀번호, 이메일 발송 |
| **responses** | SurveyResponse, Answer | 온라인 응답 수집 (부분 답변 허용), 대면 인터뷰 수동 입력, 수집 마감 |
| **aggregation** | Aggregation (ai_provider, section_summaries), ExtractedKeyword, ExtractedSentence | AI 취합, 파트별 요약 (section_summaries), 카테고리별 변화사항 (desired_changes), 원문 워딩 보존 문장 추출, 키워드 추출, 직급 가중치 기반 분석, 버전 관리, 유저 수정 |
| **design_brief** | DesignBrief (design_md, color_preferences), StitchGeneration (design_md_snapshot, stitch_project_url) | 디자인 브리프 컴파일, DESIGN.md 생성, Stitch 2단계 연동 |

### 서비스 레이어
| 서비스 | 파일 | 기능 |
|--------|------|------|
| **AIClientFactory** | `services/ai_client.py` | Claude/Gemini 선택 팩토리, 기본값 Claude |
| **ClaudeClient** | `services/claude_client.py` | Anthropic Claude API - 분석, 질문지(섹션 기반), 섹션별 추가 질문 생성, 취합(파트별/원문워딩), 파일분석, 키워드, DESIGN.md 생성 (429/529 재시도) |
| **GeminiClient** | `services/gemini_client.py` | Google Gemini API - 동일 인터페이스 (섹션 기반 질문지, 섹션별 추가 생성, 파트별 취합, 파일분석) |
| **FileExtractor** | `services/file_extractor.py` | 파일 텍스트 추출 - PDF(pypdf), DOCX(python-docx), TXT 지원 |
| **StitchClient** | `services/stitch_client.py` | Stitch Bridge 통신 - generate_design, fetch_screens |
| **CrawlerService** | `services/crawler_service.py` | httpx + BeautifulSoup 웹 크롤링 |
| **EmailService** | `services/email_service.py` | 설문 초대 이메일 발송 |

### Celery 비동기 태스크 (4개)
| 태스크 | 앱 | 기능 |
|--------|-----|------|
| `run_project_analysis` | analysis | 사이트 크롤링 + AI 분석 (ai_provider 선택) |
| `generate_questionnaire` | questionnaires | AI 질문지 생성 (섹션+세부구분+중요도/의도 포함) + 상태 폴링 |
| `run_aggregation` | aggregation | 전체 응답 취합 (직급 가중치 적용) + 파트별 요약 + 카테고리별 변화사항 + 원문 워딩 보존 문장 + 키워드 추출 |
| `run_stitch_generation` | design_brief | DESIGN.md를 Stitch에 전달 + 디자인 생성 (재시도 없음) |

### 단계별 확정/잠금 시스템
| 단계 | 확정 기능 | 잠기는 것 |
|------|----------|----------|
| 분석 | 분석 확인 | 분석 결과 편집 불가 |
| 질문지 | 질문지 확정 | 질문/섹션 추가/수정/삭제/AI생성/순서변경 불가. **초대 링크 생성의 전제조건** |
| 수집 | 수집 마감 | 설문 링크 만료, 추가 응답 불가 |

### 공개 설문 시스템
- **URL**: `/api/v1/survey/{uuid}/` — UUID v4 토큰
- **비밀번호**: 폰번호 뒷4자리 또는 랜덤 4자리 → bcrypt 해싱 → 검증 후 30분 JWT 발급
- **기능**: 설문 정보 조회, 비밀번호 확인, 질문 조회 (섹션/직급/부서별 필터 — ProjectPosition, ProjectDepartment M2M), 자동 임시저장, 제출 (부분 답변 허용)
- **질문 필터링**: 섹션 target_positions → 질문 target_positions → 질문 target_departments 순서로 체크

---

## 프론트엔드 (React + TypeScript + Vite)

### 페이지 (14개)
| 페이지 | 경로 | 기능 |
|--------|------|------|
| **LoginPage** | `/login` | 이메일/비밀번호 로그인 + 회원가입 |
| **DashboardPage** | `/dashboard` | 프로젝트 현황, 통계 카드, 빠른 실행 |
| **ProjectListPage** | `/projects` | 프로젝트 그리드, 상태 필터, 검색 |
| **ProjectCreatePage** | `/projects/new` | 프로젝트 생성 폼 (zod 유효성 검사) |
| **ProjectDetailPage** | `/projects/:id` | 6단계 프로그레스 스테퍼, 부서/직급 구조 관리, 요구사항 파일 업로드(드래그앤드롭)/AI분석 |
| **AnalysisPage** | `.../analysis` | AI 분석 실행/폴링 (AI 선택), 결과 인라인 편집, 확인 |
| **QuestionnairePage** | `.../questionnaire` | 섹션 기반 질문 표시, 초기 AI 전체 생성 → 이후 섹션별 AI 추가(개수 지정), 섹션 추가/삭제, 질문 추가/수정/삭제 (선택지 편집, 대상 부서/직급 토글 설정), dnd-kit 순서변경, 확정 잠금 |
| **DistributionPage** | `.../distribution` | 질문지 확정 전 초대링크 생성 차단, 직원 카드별 관리, 부서/직급 드롭다운(프로젝트 구조 연동), 개별 초대링크 생성/재생성/복사, 답변 상태 표시 |
| **ResponsesPage** | `.../responses` | 응답 현황 (초대 상태 기반), 진행률 바, 수동 입력, 수집 마감 |
| **ManualEntryPage** | `.../manual/:empId` | 대면 인터뷰 답변 수동 입력 (question_type 매핑) |
| **AggregationPage** | `.../aggregation` | AI 취합/폴링, 파트별 요약 표시, 카테고리별 변화사항, 종합요약/방향성/가치/핵심문장/키워드 편집 |
| **DesignBriefPage** | `.../design-brief` | 브리프 편집, 키 컬러 입력, DESIGN.md 생성/다운로드, Stitch 생성/결과가져오기/미리보기 |
| **SurveyPage** | `/survey/:token` | 공개 설문 (비밀번호 인증 → JWT → 질문 → 제출) |
| **NotFoundPage** | `*` | 404 페이지 |

### 공통 컴포넌트
- **Layout**: AppLayout, Sidebar (접이식), Header (브레드크럼, 유저메뉴), ThemeToggle
- **Common**: Button, Input, Modal, LoadingSpinner, StatusBadge, ConfirmDialog, DataTable, EmptyState, **AiProviderSelect**

### 커스텀 훅 (신규)
- **useProjectStructure**: useDepartments, useCreateDepartment, useDeleteDepartment, usePositions, useCreatePosition, useDeletePosition
- **useProjectFiles**: useProjectFiles, useUploadFile, useDeleteFile, useAnalyzeFile
- **useQuestionnaire**: useCreateSection, useDeleteSection, useGenerateSectionQuestions 추가

### 상태관리
- **Zustand**: authStore (JWT 토큰, 유저 정보), themeStore (다크/라이트 모드)
- **TanStack Query**: 모든 서버 상태 (캐싱, 폴링, Optimistic Updates)
- **폴링 패턴**: 수동 isPolling 상태 대신 `shouldPoll = data?.status === 'processing'`으로 자동 관리 (AnalysisPage, QuestionnairePage, AggregationPage 공통)

---

## Google Stitch 통합

### 아키텍처
```
Django Backend → HTTP → Stitch Bridge (Node.js/Express) → @google/stitch-sdk → Google Stitch API
```

### 2단계 생성 흐름
```
[Phase 1 - Celery Task]
1. DESIGN.md 내용을 prompt에 포함하여 전달
2. create_project → projectId + projectUrl 저장
3. create_design_system → DESIGN.md + 브랜드 컬러로 디자인 시스템 생성
4. generate_screen_from_text → 스크린 생성 시도
5. 성공 시 getHtml/getImage로 결과 저장

[Phase 2 - 사용자 수동]
6. "Stitch에서 보기" → stitch.withgoogle.com/projects/{id} 에서 편집
7. "결과 가져오기" → project.screens() → HTML/스크린샷 다운로드
8. "미리보기" → iframe srcDoc으로 HTML 렌더링
```

### Stitch Bridge 엔드포인트
- `POST /generate` — Phase 1: 프로젝트 생성 + 디자인 시스템 + 스크린 생성
- `GET /project/:id/screens` — Phase 2: 기존 프로젝트에서 스크린 조회
- `GET /tools` — 디버깅: 사용 가능한 Stitch tool 목록

### DESIGN.md 포맷 (Google Stitch 호환)
6개 섹션: Visual Theme & Atmosphere, Color Palette & Roles, Typography Rules, Component Stylings, Layout Principles, Design System Notes for Stitch Generation

---

## 인프라

### Docker Compose 서비스 (8개)
PostgreSQL, Redis, Django Backend, Celery Worker, Celery Beat, React Frontend, Stitch Bridge, Nginx

### 시작 방법
```bash
cp .env.example .env
# .env에서 API 키 설정:
#   GEMINI_API_KEY (Google AI Studio)
#   ANTHROPIC_API_KEY (Anthropic Console)
#   STITCH_API_KEY (Google Stitch - 없으면 Mock 동작)
#   DEFAULT_AI_PROVIDER=claude
docker compose up --build
```

### 접속
- 프론트엔드: http://localhost:3000
- 백엔드 API: http://localhost:8000/api/v1/
- Stitch Bridge: http://localhost:3001/health
- Django Admin: http://localhost:8000/admin/

---

## 향후 작업
- [ ] SSO 인증 연동
- [ ] Playwright 스크린샷 서비스 Docker 설정
- [ ] 프론트엔드 코드 스플리팅 (dynamic import)
- [ ] E2E 테스트 (Playwright)
- [ ] 프로덕션 배포 설정 (SSL, 도메인 등)
- [ ] Stitch 편집(edit_screens) 기능 연동
- [ ] Stitch variants 생성 기능 연동
