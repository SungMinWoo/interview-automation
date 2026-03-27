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

export type QuestionType = 'single_choice' | 'multiple_choice' | 'scale' | 'open_ended' | 'ranking';

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
  options: QuestionOption[];
  isRequired: boolean;
  order: number;
  description?: string;
  createdAt: string;
  updatedAt: string;
}

export interface QuestionCreateRequest {
  categoryId?: number;
  text: string;
  type: QuestionType;
  options?: Omit<QuestionOption, 'id'>[];
  isRequired?: boolean;
  order?: number;
  description?: string;
}

export interface QuestionUpdateRequest {
  categoryId?: number;
  text?: string;
  type?: QuestionType;
  options?: Omit<QuestionOption, 'id'>[];
  isRequired?: boolean;
  order?: number;
  description?: string;
}

export interface QuestionReorderRequest {
  questionIds: number[];
}

export interface Questionnaire {
  id: number;
  projectId: number;
  title: string;
  description?: string;
  introMessage?: string;
  outroMessage?: string;
  categories: PositionCategory[];
  questions: Question[];
  isGenerated: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface QuestionnaireUpdateRequest {
  title?: string;
  description?: string;
  introMessage?: string;
  outroMessage?: string;
}
