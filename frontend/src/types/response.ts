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
