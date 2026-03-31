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
  text: string;
  type: QuestionType;
  question_type?: QuestionType;
  options: QuestionOption[];
  isRequired: boolean;
  is_required?: boolean;
  order: number;
  description?: string;
  importance: number;
  purpose?: string;
  createdAt: string;
  updatedAt: string;
}

export interface QuestionCreateRequest {
  text: string;
  question_type?: QuestionType;
  description?: string;
  is_required?: boolean;
  importance?: number;
  purpose?: string;
  options?: string[];
}

export interface QuestionUpdateRequest {
  text?: string;
  type?: QuestionType;
  question_type?: QuestionType;
  description?: string;
  isRequired?: boolean;
  is_required?: boolean;
  importance?: number;
  purpose?: string;
  order?: number;
}

export interface QuestionReorderRequest {
  questionIds: number[];
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
