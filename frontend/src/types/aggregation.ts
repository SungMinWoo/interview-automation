export type AggregationStatus = 'pending' | 'processing' | 'completed' | 'failed';
export type AiProvider = 'claude' | 'gemini';

export interface Keyword {
  id: number;
  aggregation: number;
  text: string;
  category?: string;
  weight: number;
  is_user_added: boolean;
  order: number;
}

export interface KeywordCreateRequest {
  text: string;
  category?: string;
  weight?: number;
}

export interface KeywordUpdateRequest {
  text?: string;
  category?: string;
  weight?: number;
}

export interface Sentence {
  id: number;
  aggregation: number;
  text: string;
  category?: string;
  source_question?: number | null;
  is_user_added: boolean;
  order: number;
}

export interface SentenceCreateRequest {
  text: string;
  category?: string;
}

export interface SentenceUpdateRequest {
  text?: string;
  category?: string;
}

export interface SectionSummary {
  section_title: string;
  summary: string;
  key_quotes?: string[];
}

export interface DesiredChangeCategory {
  category: string;
  items: string[];
}

export interface Aggregation {
  id: number;
  project: number;
  status: AggregationStatus;
  version: number;
  ai_provider?: AiProvider;
  raw_ai_response?: Record<string, unknown>;
  summary: string;
  section_summaries?: SectionSummary[];
  company_direction: string;
  desired_changes: string[] | DesiredChangeCategory[];
  company_values: string[];
  error_message?: string;
  keywords: Keyword[];
  sentences: Sentence[];
  created_at: string;
}

export interface AggregationStatusResponse {
  id: number;
  status: AggregationStatus;
  version: number;
  ai_provider?: string;
  error_message?: string;
}
