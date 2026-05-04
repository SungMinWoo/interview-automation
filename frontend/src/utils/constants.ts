import type { MemberRole } from '@/types/member';
import type { ProjectStatus } from '@/types/project';
import type { AnalysisStatus } from '@/types/analysis';
import type { InvitationStatus } from '@/types/distribution';
import type { ResponseStatus } from '@/types/response';
import type { AggregationStatus } from '@/types/aggregation';
import type { BriefStatus, StitchStatus } from '@/types/designBrief';

// --- Status Labels (Korean) ---

export const PROJECT_STATUS_LABELS: Record<ProjectStatus, string> = {
  created: '생성됨',
  analyzing: '분석 중',
  analysis_ready: '분석 완료',
  analysis_confirmed: '분석 확인됨',
  questionnaire_ready: '질문지 완료',
  distributing: '배포 중',
  collecting: '수집 중',
  closed: '마감됨',
  aggregating: '취합 중',
  aggregation_ready: '취합 완료',
  brief_ready: '브리프 완료',
  completed: '완료',
};

export const PROJECT_STATUS_COLORS: Record<ProjectStatus, string> = {
  created: 'bg-surface-hover text-content-secondary',
  analyzing: 'bg-surface-hover text-content-primary',
  analysis_ready: 'bg-surface-hover text-content-primary',
  analysis_confirmed: 'bg-success-bg text-success',
  questionnaire_ready: 'bg-surface-hover text-content-primary',
  distributing: 'bg-warning-bg text-warning',
  collecting: 'bg-warning-bg text-warning',
  closed: 'bg-surface-hover text-content-secondary',
  aggregating: 'bg-surface-hover text-content-primary',
  aggregation_ready: 'bg-surface-hover text-content-primary',
  brief_ready: 'bg-surface-hover text-content-primary',
  completed: 'bg-success-bg text-success',
};

// --- Project Type ---
export type ProjectTypeKey = 'uxui' | 'bx';

export const PROJECT_TYPE_LABELS: Record<ProjectTypeKey, string> = {
  uxui: 'UX/UI',
  bx: 'BX',
};

export const PROJECT_TYPE_COLORS: Record<ProjectTypeKey, string> = {
  uxui: 'bg-surface-hover text-content-primary',
  bx: 'bg-accent/10 text-accent',
};

export const ANALYSIS_STATUS_LABELS: Record<AnalysisStatus, string> = {
  pending: '대기 중',
  processing: '분석 중',
  completed: '완료',
  confirmed: '확인됨',
  failed: '실패',
};

export const INVITATION_STATUS_LABELS: Record<InvitationStatus, string> = {
  pending: '대기',
  sent: '발송됨',
  opened: '열람',
  completed: '완료',
  failed: '실패',
  expired: '만료',
};

export const INVITATION_STATUS_COLORS: Record<InvitationStatus, string> = {
  pending: 'bg-surface-hover text-content-secondary',
  sent: 'bg-surface-hover text-content-primary',
  opened: 'bg-warning-bg text-warning',
  completed: 'bg-success-bg text-success',
  failed: 'bg-danger-bg text-danger',
  expired: 'bg-surface-hover text-content-tertiary',
};

export const RESPONSE_STATUS_LABELS: Record<ResponseStatus, string> = {
  in_progress: '진행 중',
  completed: '완료',
  abandoned: '중단',
};

export const RESPONSE_STATUS_COLORS: Record<ResponseStatus, string> = {
  in_progress: 'bg-warning-bg text-warning',
  completed: 'bg-success-bg text-success',
  abandoned: 'bg-danger-bg text-danger',
};

export const AGGREGATION_STATUS_LABELS: Record<AggregationStatus, string> = {
  pending: '대기 중',
  processing: '취합 중',
  completed: '완료',
  failed: '실패',
};

export const BRIEF_STATUS_LABELS: Record<BriefStatus, string> = {
  draft: '초안',
  generating: '생성 중',
  completed: '완료',
  finalized: '확정',
};

export const STITCH_STATUS_LABELS: Record<StitchStatus, string> = {
  pending: '대기',
  processing: '생성 중',
  completed: '완료',
  failed: '실패',
};

export const SENTIMENT_LABELS: Record<string, string> = {
  positive: '긍정',
  negative: '부정',
  neutral: '중립',
};

export const SENTIMENT_COLORS: Record<string, string> = {
  positive: 'bg-success-bg text-success',
  negative: 'bg-danger-bg text-danger',
  neutral: 'bg-surface-hover text-content-secondary',
};

// --- Member Roles ---

export const MEMBER_ROLE_LABELS: Record<MemberRole, string> = {
  owner: '소유자',
  admin: '관리자',
  editor: '편집자',
  viewer: '뷰어',
};

export const MEMBER_ROLE_COLORS: Record<MemberRole, string> = {
  owner: 'bg-accent/10 text-accent',
  admin: 'bg-warning-bg text-warning',
  editor: 'bg-success-bg text-success',
  viewer: 'bg-surface-hover text-content-secondary',
};

export const ASSIGNABLE_ROLES: { value: MemberRole; label: string }[] = [
  { value: 'admin', label: '관리자' },
  { value: 'editor', label: '편집자' },
  { value: 'viewer', label: '뷰어' },
];

// --- AI Provider ---

export type AiProvider = 'claude' | 'gemini';

export const AI_PROVIDER_LABELS: Record<AiProvider, string> = {
  claude: 'Claude',
  gemini: 'Gemini',
};

export const AI_PROVIDER_OPTIONS: { value: AiProvider; label: string }[] = [
  { value: 'claude', label: 'Claude' },
  { value: 'gemini', label: 'Gemini' },
];

export const DEFAULT_AI_PROVIDER: AiProvider = 'claude';

export const QUESTION_TYPE_LABELS: Record<string, string> = {
  text: '단답형',
  textarea: '서술형',
  single_choice: '단일 선택',
  multiple_choice: '복수 선택',
  rating: '평점',
  ranking: '순위',
};

export const IMPORTANCE_LABELS: Record<string, string> = {
  required: '필수',
  important: '중요',
  optional: '선택',
};

export const IMPORTANCE_COLORS: Record<string, string> = {
  required: 'bg-danger-bg text-danger',
  important: 'bg-warning-bg text-warning',
  optional: 'bg-surface-hover text-content-tertiary',
};

export const IMPORTANCE_OPTIONS: { value: string; label: string }[] = [
  { value: 'required', label: '필수' },
  { value: 'important', label: '중요' },
  { value: 'optional', label: '선택' },
];

export const SECTION_IMPORTANCE_LABELS: Record<string, string> = {
  high: '상',
  medium: '중',
  low: '하',
};

export const SECTION_IMPORTANCE_COLORS: Record<string, string> = {
  high: 'bg-danger-bg text-danger',
  medium: 'bg-warning-bg text-warning',
  low: 'bg-surface-hover text-content-tertiary',
};

export const SECTION_IMPORTANCE_OPTIONS: { value: string; label: string }[] = [
  { value: 'high', label: '상' },
  { value: 'medium', label: '중' },
  { value: 'low', label: '하' },
];

// --- Project Phase Steps ---

export const PROJECT_PHASES = [
  { key: 'analysis', label: '분석', path: 'analysis' },
  { key: 'questionnaire', label: '질문지', path: 'questionnaire' },
  { key: 'distribution', label: '배포', path: 'distribution' },
  { key: 'collection', label: '수집', path: 'responses' },
  { key: 'aggregation', label: '취합', path: 'aggregation' },
  { key: 'brief', label: '디자인 브리프', path: 'design-brief' },
] as const;

// --- API Paths ---

export const API_PATHS = {
  AUTH: {
    LOGIN: '/auth/login/',
    REGISTER: '/auth/register/',
    LOGOUT: '/auth/logout/',
    ME: '/auth/me/',
    REFRESH: '/auth/token/refresh/',
    USER_SEARCH: '/auth/users/search/',
  },
  PROJECTS: '/projects/',
  project: (id: number) => `/projects/${id}/`,
  ANALYSIS: (projectId: number) => `/projects/${projectId}/analysis/`,
  ANALYSIS_TRIGGER: (projectId: number) => `/projects/${projectId}/analysis/trigger/`,
  ANALYSIS_STATUS: (projectId: number) => `/projects/${projectId}/analysis/status/`,
  ANALYSIS_CONFIRM: (projectId: number) => `/projects/${projectId}/analysis/confirm/`,
  ANALYSIS_REGENERATE_SECTION: (projectId: number) => `/projects/${projectId}/analysis/regenerate-section/`,
  QUESTIONNAIRE: (projectId: number) => `/projects/${projectId}/questionnaire/`,
  QUESTIONNAIRE_GENERATE: (projectId: number) => `/projects/${projectId}/questionnaire/generate/`,
  QUESTIONNAIRE_STATUS: (projectId: number) => `/projects/${projectId}/questionnaire/status/`,
  QUESTIONNAIRE_CONFIRM: (projectId: number) => `/projects/${projectId}/questionnaire/confirm/`,
  QUESTIONS: (projectId: number) => `/projects/${projectId}/questionnaire/questions/`,
  QUESTION: (projectId: number, qId: number) => `/projects/${projectId}/questionnaire/questions/${qId}/`,
  QUESTIONS_REORDER: (projectId: number) => `/projects/${projectId}/questionnaire/questions/reorder/`,
  QUESTIONNAIRE_SECTIONS: (projectId: number) => `/projects/${projectId}/questionnaire/sections/`,
  QUESTIONNAIRE_SECTION: (projectId: number, sectionId: number) => `/projects/${projectId}/questionnaire/sections/${sectionId}/`,
  QUESTIONNAIRE_SECTION_GENERATE: (projectId: number, sectionId: number) => `/projects/${projectId}/questionnaire/sections/${sectionId}/generate/`,
  QUESTIONNAIRE_TEMPLATES: (projectId: number) => `/projects/${projectId}/questionnaire/templates/`,
  QUESTIONNAIRE_IMPORT: (projectId: number) => `/projects/${projectId}/questionnaire/import/`,
  PROJECT_FILES: (projectId: number) => `/projects/${projectId}/files/`,
  PROJECT_FILE: (projectId: number, fileId: number) => `/projects/${projectId}/files/${fileId}/`,
  PROJECT_FILE_ANALYZE: (projectId: number, fileId: number) => `/projects/${projectId}/files/${fileId}/analyze/`,
  PROJECT_ACTIVITIES: (projectId: number) => `/projects/${projectId}/activities/`,
  DEPARTMENTS: (projectId: number) => `/projects/${projectId}/departments/`,
  DEPARTMENT: (projectId: number, deptId: number) => `/projects/${projectId}/departments/${deptId}/`,
  POSITIONS: (projectId: number) => `/projects/${projectId}/positions/`,
  POSITION: (projectId: number, posId: number) => `/projects/${projectId}/positions/${posId}/`,
  EMPLOYEES: (projectId: number) => `/projects/${projectId}/employees/`,
  EMPLOYEE: (projectId: number, empId: number) => `/projects/${projectId}/employees/${empId}/`,
  EMPLOYEES_BULK: (projectId: number) => `/projects/${projectId}/employees/bulk/`,
  INVITATIONS: (projectId: number) => `/projects/${projectId}/invitations/`,
  INVITATIONS_GENERATE: (projectId: number) => `/projects/${projectId}/invitations/generate/`,
  INVITATIONS_SEND: (projectId: number) => `/projects/${projectId}/invitations/send/`,
  INVITATION_RESEND: (projectId: number, invId: number) => `/projects/${projectId}/invitations/${invId}/resend/`,
  INVITATION_REGENERATE: (projectId: number, empId: number) => `/projects/${projectId}/invitations/${empId}/regenerate/`,
  RESPONSES: (projectId: number) => `/projects/${projectId}/responses/`,
  RESPONSE: (projectId: number, resId: number) => `/projects/${projectId}/responses/${resId}/`,
  RESPONSES_CLOSE: (projectId: number) => `/projects/${projectId}/responses/close/`,
  MANUAL_ENTRY_START: (projectId: number) => `/projects/${projectId}/manual-entry/start/`,
  MANUAL_ENTRY_SUBMIT: (projectId: number) => `/projects/${projectId}/manual-entry/submit/`,
  AGGREGATION: (projectId: number) => `/projects/${projectId}/aggregation/`,
  AGGREGATION_STATUS: (projectId: number) => `/projects/${projectId}/aggregation/status/`,
  AGGREGATION_TRIGGER: (projectId: number) => `/projects/${projectId}/aggregation/trigger/`,
  AGGREGATION_REGENERATE: (projectId: number) => `/projects/${projectId}/aggregation/regenerate/`,
  KEYWORDS: (projectId: number) => `/projects/${projectId}/aggregation/keywords/`,
  KEYWORD: (projectId: number, kwId: number) => `/projects/${projectId}/aggregation/keywords/${kwId}/`,
  KEYWORDS_GENERATE: (projectId: number) => `/projects/${projectId}/aggregation/keywords/generate/`,
  SENTENCES: (projectId: number) => `/projects/${projectId}/aggregation/sentences/`,
  SENTENCE: (projectId: number, sId: number) => `/projects/${projectId}/aggregation/sentences/${sId}/`,
  BRIEF: (projectId: number) => `/projects/${projectId}/design-brief/`,
  BRIEF_COMPILE: (projectId: number) => `/projects/${projectId}/design-brief/compile/`,
  STITCH_LIST: (projectId: number) => `/projects/${projectId}/design-brief/stitch/`,
  STITCH_GENERATE: (projectId: number) => `/projects/${projectId}/design-brief/stitch/generate/`,
  STITCH_DETAIL: (projectId: number, sId: number) => `/projects/${projectId}/design-brief/stitch/${sId}/`,
  STITCH_REGENERATE: (projectId: number, sId: number) => `/projects/${projectId}/design-brief/stitch/${sId}/regenerate/`,
  STITCH_FETCH: (projectId: number, sId: number) => `/projects/${projectId}/design-brief/stitch/${sId}/fetch/`,
  BRIEF_EXPORT: (projectId: number) => `/projects/${projectId}/design-brief/export/`,
  DESIGN_MD_GENERATE: (projectId: number) => `/projects/${projectId}/design-brief/design-md/generate/`,
  DESIGN_MD_DOWNLOAD: (projectId: number) => `/projects/${projectId}/design-brief/design-md/download/`,
  PROJECT_COMPLETE: (projectId: number) => `/projects/${projectId}/design-brief/complete/`,
  SURVEY: (token: string) => `/survey/${token}/`,
  SURVEY_VERIFY: (token: string) => `/survey/${token}/verify/`,
  SURVEY_SUBMIT: (token: string) => `/survey/${token}/submit/`,
  SURVEY_DRAFT: (token: string) => `/survey/${token}/draft/`,
  // Members
  MEMBERS: (projectId: number) => `/projects/${projectId}/members/`,
  MEMBER: (projectId: number, memberId: number) => `/projects/${projectId}/members/${memberId}/`,
  TRANSFER_OWNERSHIP: (projectId: number) => `/projects/${projectId}/transfer-ownership/`,
  // Admin (site-wide user management)
  ADMIN_USERS: '/auth/users/manage/',
  ADMIN_USER: (id: number) => `/auth/users/manage/${id}/`,
  // Notifications
  NOTIFICATIONS: '/notifications/',
  NOTIFICATIONS_UNREAD_COUNT: '/notifications/unread-count/',
  NOTIFICATION_READ: (id: number) => `/notifications/${id}/read/`,
  NOTIFICATIONS_READ_ALL: '/notifications/read-all/',
  // Tools (project-independent)
  TOOLS_ANALYZE_SITE: '/tools/analyze-site/',
  TOOLS_ANALYZE_FILE: '/tools/analyze-file/',
} as const;
