export type AggregationStatus = 'pending' | 'processing' | 'completed' | 'failed';

export interface Keyword {
  id: number;
  aggregationId: number;
  text: string;
  frequency: number;
  category?: string;
  sentiment?: 'positive' | 'negative' | 'neutral';
  createdAt: string;
  updatedAt: string;
}

export interface KeywordCreateRequest {
  text: string;
  frequency?: number;
  category?: string;
  sentiment?: 'positive' | 'negative' | 'neutral';
}

export interface KeywordUpdateRequest {
  text?: string;
  frequency?: number;
  category?: string;
  sentiment?: 'positive' | 'negative' | 'neutral';
}

export interface Sentence {
  id: number;
  aggregationId: number;
  text: string;
  sourceQuestionId?: number;
  sourceResponseId?: number;
  category?: string;
  importance: number;
  createdAt: string;
  updatedAt: string;
}

export interface SentenceCreateRequest {
  text: string;
  sourceQuestionId?: number;
  sourceResponseId?: number;
  category?: string;
  importance?: number;
}

export interface SentenceUpdateRequest {
  text?: string;
  category?: string;
  importance?: number;
}

export interface QuestionAggregation {
  questionId: number;
  questionText: string;
  questionType: string;
  responseCount: number;
  summary?: string;
  distribution?: Record<string, number>;
  average?: number;
  keywords: Keyword[];
  keySentences: Sentence[];
}

export interface Aggregation {
  id: number;
  projectId: number;
  status: AggregationStatus;
  totalResponses: number;
  questionAggregations: QuestionAggregation[];
  overallKeywords: Keyword[];
  overallSentences: Sentence[];
  insights?: string[];
  createdAt: string;
  updatedAt: string;
}

export interface AggregationStatusResponse {
  status: AggregationStatus;
  progress?: number;
  message?: string;
}
