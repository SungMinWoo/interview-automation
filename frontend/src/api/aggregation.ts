import apiClient from './client';
import type {
  Aggregation,
  AggregationStatusResponse,
  Keyword,
  KeywordCreateRequest,
  KeywordUpdateRequest,
  Sentence,
  SentenceCreateRequest,
  SentenceUpdateRequest,
} from '../types/aggregation';

// Aggregation
export const triggerAggregation = async (projectId: number): Promise<Aggregation> => {
  const response = await apiClient.post<Aggregation>(`/projects/${projectId}/aggregation/`);
  return response.data;
};

export const getAggregation = async (projectId: number): Promise<Aggregation> => {
  const response = await apiClient.get<Aggregation>(`/projects/${projectId}/aggregation/`);
  return response.data;
};

export const getAggregationStatus = async (
  projectId: number,
): Promise<AggregationStatusResponse> => {
  const response = await apiClient.get<AggregationStatusResponse>(
    `/projects/${projectId}/aggregation/status/`,
  );
  return response.data;
};

export const regenerateAggregation = async (projectId: number): Promise<Aggregation> => {
  const response = await apiClient.post<Aggregation>(
    `/projects/${projectId}/aggregation/regenerate/`,
  );
  return response.data;
};

// Keywords
export const getKeywords = async (projectId: number): Promise<Keyword[]> => {
  const response = await apiClient.get<Keyword[]>(
    `/projects/${projectId}/aggregation/keywords/`,
  );
  return response.data;
};

export const createKeyword = async (
  projectId: number,
  data: KeywordCreateRequest,
): Promise<Keyword> => {
  const response = await apiClient.post<Keyword>(
    `/projects/${projectId}/aggregation/keywords/`,
    data,
  );
  return response.data;
};

export const updateKeyword = async (
  projectId: number,
  keywordId: number,
  data: KeywordUpdateRequest,
): Promise<Keyword> => {
  const response = await apiClient.patch<Keyword>(
    `/projects/${projectId}/aggregation/keywords/${keywordId}/`,
    data,
  );
  return response.data;
};

export const deleteKeyword = async (projectId: number, keywordId: number): Promise<void> => {
  await apiClient.delete(`/projects/${projectId}/aggregation/keywords/${keywordId}/`);
};

// Sentences
export const getSentences = async (projectId: number): Promise<Sentence[]> => {
  const response = await apiClient.get<Sentence[]>(
    `/projects/${projectId}/aggregation/sentences/`,
  );
  return response.data;
};

export const createSentence = async (
  projectId: number,
  data: SentenceCreateRequest,
): Promise<Sentence> => {
  const response = await apiClient.post<Sentence>(
    `/projects/${projectId}/aggregation/sentences/`,
    data,
  );
  return response.data;
};

export const updateSentence = async (
  projectId: number,
  sentenceId: number,
  data: SentenceUpdateRequest,
): Promise<Sentence> => {
  const response = await apiClient.patch<Sentence>(
    `/projects/${projectId}/aggregation/sentences/${sentenceId}/`,
    data,
  );
  return response.data;
};

export const deleteSentence = async (projectId: number, sentenceId: number): Promise<void> => {
  await apiClient.delete(`/projects/${projectId}/aggregation/sentences/${sentenceId}/`);
};
