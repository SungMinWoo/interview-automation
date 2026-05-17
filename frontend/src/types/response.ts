export type ResponseStatus = 'in_progress' | 'completed' | 'abandoned';

export interface QuestionAnswer {
  questionId: number;
  questionText: string;
  questionType: string;
  answer: string | string[] | number | null;
}

export interface SurveyResponse {
  id: number;
  projectId: number;
  employeeId?: number;
  employeeName?: string;
  employeeDepartment?: string;
  employeePosition?: string;
  invitationId?: number;
  status: ResponseStatus;
  answers: QuestionAnswer[];
  isManualEntry: boolean;
  startedAt: string;
  completedAt?: string;
  createdAt: string;
  updatedAt: string;
}

export interface ResponseListResponse {
  count: number;
  next: string | null;
  previous: string | null;
  results: SurveyResponse[];
}

export interface ManualEntryStartRequest {
  employeeName: string;
  employeeDepartment?: string;
  employeePosition?: string;
}

export interface ManualEntrySubmitRequest {
  answers: Array<{
    questionId: number;
    answer: string | string[] | number;
  }>;
}

export interface CollectionStats {
  total: number;
  completed: number;
  inProgress: number;
  abandoned: number;
  completionRate: number;
}

// 대면 인터뷰 멤버별 draft
export interface ManualDraftAnswer {
  question: number;
  text_value: string;
  choice_values: string[];
  rating_value: number | null;
  updated_at: string;
}

export interface ManualDraft {
  id: number;
  project: number;
  employee: number;
  employee_name?: string;
  author: number;
  author_name: string | null;
  is_submitted: boolean;
  submitted_at: string | null;
  answers?: ManualDraftAnswer[];
  answer_count: number;
  started_at: string;
  updated_at: string;
}

export interface EmployeeDraftsSummary {
  employee_id: number;
  employee_name: string;
  drafts: ManualDraft[];
  merged_response_id: number | null;
  merged_at: string | null;
}

export interface MergeAnswerInput {
  question_id: number;
  text_value?: string;
  choice_values?: string[];
  rating_value?: number | null;
}
