import apiClient from './client';
import type {
  SurveyResponse,
  ResponseListResponse,
  ManualEntryStartRequest,
  ManualEntrySubmitRequest,
  CollectionStats,
} from '../types/response';

export const getResponses = async (projectId: number): Promise<ResponseListResponse> => {
  const response = await apiClient.get<ResponseListResponse>(
    `/projects/${projectId}/responses/`,
  );
  return response.data;
};

export const getResponse = async (
  projectId: number,
  responseId: number,
): Promise<SurveyResponse> => {
  const response = await apiClient.get<SurveyResponse>(
    `/projects/${projectId}/responses/${responseId}/`,
  );
  return response.data;
};

export const closeCollection = async (projectId: number): Promise<void> => {
  await apiClient.post(`/projects/${projectId}/responses/close/`);
};

export const getCollectionStats = async (projectId: number): Promise<CollectionStats> => {
  const response = await apiClient.get<CollectionStats>(
    `/projects/${projectId}/responses/stats/`,
  );
  return response.data;
};

export const startManualEntry = async (
  projectId: number,
  data: ManualEntryStartRequest,
): Promise<SurveyResponse> => {
  const response = await apiClient.post<SurveyResponse>(
    `/projects/${projectId}/responses/manual/start/`,
    data,
  );
  return response.data;
};

export const submitManualEntry = async (
  projectId: number,
  responseId: number,
  data: ManualEntrySubmitRequest,
): Promise<SurveyResponse> => {
  const response = await apiClient.post<SurveyResponse>(
    `/projects/${projectId}/responses/${responseId}/manual/submit/`,
    data,
  );
  return response.data;
};
