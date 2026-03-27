import apiClient from './client';
import type {
  AnalysisResult,
  AnalysisUpdateRequest,
  AnalysisStatusResponse,
} from '../types/analysis';

export const triggerAnalysis = async (projectId: number): Promise<AnalysisResult> => {
  const response = await apiClient.post<AnalysisResult>(`/projects/${projectId}/analysis/trigger/`);
  return response.data;
};

export const getAnalysis = async (projectId: number): Promise<AnalysisResult> => {
  const response = await apiClient.get<AnalysisResult>(`/projects/${projectId}/analysis/`);
  return response.data;
};

export const updateAnalysis = async (
  projectId: number,
  data: AnalysisUpdateRequest,
): Promise<AnalysisResult> => {
  const response = await apiClient.patch<AnalysisResult>(`/projects/${projectId}/analysis/`, data);
  return response.data;
};

export const confirmAnalysis = async (projectId: number): Promise<AnalysisResult> => {
  const response = await apiClient.post<AnalysisResult>(`/projects/${projectId}/analysis/confirm/`);
  return response.data;
};

export const getAnalysisStatus = async (projectId: number): Promise<AnalysisStatusResponse> => {
  const response = await apiClient.get<AnalysisStatusResponse>(
    `/projects/${projectId}/analysis/status/`,
  );
  return response.data;
};
