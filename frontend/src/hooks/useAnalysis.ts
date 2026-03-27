import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import apiClient from '@/api/client';
import { API_PATHS } from '@/utils/constants';
import type { AnalysisResult, AnalysisUpdateRequest, AnalysisStatusResponse } from '@/types/analysis';

const analysisKey = (projectId: number) => ['analysis', projectId];
const analysisStatusKey = (projectId: number) => ['analysis', projectId, 'status'];

export function useAnalysis(projectId: number | undefined) {
  return useQuery<AnalysisResult>({
    queryKey: analysisKey(projectId!),
    queryFn: async () => {
      const res = await apiClient.get<AnalysisResult>(API_PATHS.ANALYSIS(projectId!));
      return res.data;
    },
    enabled: !!projectId,
  });
}

export function useAnalysisStatus(projectId: number | undefined, enabled: boolean = false) {
  return useQuery<AnalysisStatusResponse>({
    queryKey: analysisStatusKey(projectId!),
    queryFn: async () => {
      const res = await apiClient.get<AnalysisStatusResponse>(API_PATHS.ANALYSIS_STATUS(projectId!));
      return res.data;
    },
    enabled: !!projectId && enabled,
    refetchInterval: (query) => {
      const data = query.state.data;
      return data?.status === 'processing' ? 3000 : false;
    },
  });
}

export function useTriggerAnalysis() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (projectId: number) => {
      const res = await apiClient.post<AnalysisResult>(API_PATHS.ANALYSIS_TRIGGER(projectId));
      return res.data;
    },
    onSuccess: (_data, projectId) => {
      queryClient.invalidateQueries({ queryKey: analysisKey(projectId) });
      queryClient.invalidateQueries({ queryKey: analysisStatusKey(projectId) });
    },
  });
}

export function useUpdateAnalysis() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ projectId, data }: { projectId: number; data: AnalysisUpdateRequest }) => {
      const res = await apiClient.patch<AnalysisResult>(API_PATHS.ANALYSIS(projectId), data);
      return res.data;
    },
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: analysisKey(variables.projectId) });
    },
  });
}

export function useConfirmAnalysis() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (projectId: number) => {
      const res = await apiClient.post<AnalysisResult>(API_PATHS.ANALYSIS_CONFIRM(projectId));
      return res.data;
    },
    onSuccess: (_data, projectId) => {
      queryClient.invalidateQueries({ queryKey: analysisKey(projectId) });
      queryClient.invalidateQueries({ queryKey: ['projects', projectId] });
    },
  });
}
