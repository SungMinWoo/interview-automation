import apiClient from './client';
import type {
  DesignBrief,
  BriefUpdateRequest,
  StitchGeneration,
  StitchGenerateRequest,
  ExportBriefRequest,
  ExportBriefResponse,
} from '../types/designBrief';

// Brief
export const compileBrief = async (projectId: number): Promise<DesignBrief> => {
  const response = await apiClient.post<DesignBrief>(`/projects/${projectId}/brief/compile/`);
  return response.data;
};

export const getBrief = async (projectId: number): Promise<DesignBrief> => {
  const response = await apiClient.get<DesignBrief>(`/projects/${projectId}/brief/`);
  return response.data;
};

export const updateBrief = async (
  projectId: number,
  data: BriefUpdateRequest,
): Promise<DesignBrief> => {
  const response = await apiClient.patch<DesignBrief>(`/projects/${projectId}/brief/`, data);
  return response.data;
};

// Stitch Generations
export const triggerStitchGeneration = async (
  projectId: number,
  data?: StitchGenerateRequest,
): Promise<StitchGeneration> => {
  const response = await apiClient.post<StitchGeneration>(
    `/projects/${projectId}/brief/stitch/generate/`,
    data,
  );
  return response.data;
};

export const getStitchGenerations = async (projectId: number): Promise<StitchGeneration[]> => {
  const response = await apiClient.get<StitchGeneration[]>(
    `/projects/${projectId}/brief/stitch/`,
  );
  return response.data;
};

export const getStitchGeneration = async (
  projectId: number,
  generationId: number,
): Promise<StitchGeneration> => {
  const response = await apiClient.get<StitchGeneration>(
    `/projects/${projectId}/brief/stitch/${generationId}/`,
  );
  return response.data;
};

export const regenerateStitchGeneration = async (
  projectId: number,
  generationId: number,
): Promise<StitchGeneration> => {
  const response = await apiClient.post<StitchGeneration>(
    `/projects/${projectId}/brief/stitch/${generationId}/regenerate/`,
  );
  return response.data;
};

// Export
export const exportBrief = async (
  projectId: number,
  data: ExportBriefRequest,
): Promise<ExportBriefResponse> => {
  const response = await apiClient.post<ExportBriefResponse>(
    `/projects/${projectId}/brief/export/`,
    data,
  );
  return response.data;
};
