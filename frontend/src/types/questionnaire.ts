export interface PositionCategory {
  id: number;
  projectId: number;
  name: string;
  description?: string;
  order: number;
  createdAt: string;
  updatedAt: string;
}

export interface PositionCategoryCreateRequest {
  name: string;
  description?: string;
  order?: number;
}

export interface PositionCategoryUpdateRequest {
  name?: string;
  description?: string;
  order?: number;
}

export type QuestionType = 'text' | 'textarea' | 'single_choice' | 'multiple_choice' | 'rating' | 'ranking';

export interface QuestionOption {
  id: number;
  text: string;
  order: number;
}

export interface Question {
  id: number;
  questionnaireId: number;
  categoryId?: number;
  section?: number | null;
  sub_category?: string;
  text: string;
  type: QuestionType;
  question_type?: QuestionType;
  options: QuestionOption[] | string[];
  order: number;
  description?: string;
  importance: string;
  purpose?: string;
  target_departments?: number[];
  target_positions?: number[];
  createdAt: string;
  updatedAt: string;
}

export interface QuestionCreateRequest {
  text: string;
  question_type?: QuestionType;
  sub_category?: string;
  description?: string;
  importance?: string;
  purpose?: string;
  options?: string[];
  section?: number | null;
  target_departments?: number[];
  target_positions?: number[];
}

export interface QuestionUpdateRequest {
  text?: string;
  question_type?: QuestionType;
  description?: string;
  importance?: string;
  purpose?: string;
  order?: number;
  options?: string[];
  sub_category?: string;
  section?: number | null;
  target_departments?: number[];
  target_positions?: number[];
}

export interface QuestionReorderRequest {
  questionIds: number[];
}

export interface QuestionSection {
  id: number;
  questionnaire: number;
  title: string;
  description?: string;
  importance?: string;
  target_area?: string;
  order: number;
  target_positions?: number[];
  questions: Question[];
}

export interface QuestionSectionCreateRequest {
  title: string;
  description?: string;
  importance?: string;
  target_area?: string;
  order?: number;
}

export type AiProvider = 'claude' | 'gemini';
export type QuestionnaireStatus = 'pending' | 'processing' | 'completed' | 'failed';

export interface Questionnaire {
  id: number;
  projectId: number;
  title: string;
  description?: string;
  introMessage?: string;
  outroMessage?: string;
  status?: QuestionnaireStatus;
  ai_provider?: AiProvider;
  error_message?: string;
  sections: QuestionSection[];
  categories: PositionCategory[];
  questions: Question[];
  isGenerated: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface QuestionnaireStatusResponse {
  id: number;
  status: QuestionnaireStatus;
  ai_provider?: string;
  error_message?: string;
  updated_at?: string;
}

export interface QuestionnaireUpdateRequest {
  title?: string;
  description?: string;
  introMessage?: string;
  outroMessage?: string;
}
