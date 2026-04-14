import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import apiClient from '@/api/client';
import { API_PATHS } from '@/utils/constants';
import type { ProjectFile } from '@/types/project';

const filesKey = (projectId: number) => ['project-files', projectId];

export function useProjectFiles(projectId: number | undefined) {
  return useQuery<ProjectFile[]>({
    queryKey: filesKey(projectId!),
    queryFn: async () => {
      const res = await apiClient.get(API_PATHS.PROJECT_FILES(projectId!));
      if (Array.isArray(res.data)) return res.data;
      return res.data.results ?? [];
    },
    enabled: !!projectId,
  });
}

export function useUploadFile() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ projectId, file }: { projectId: number; file: File }) => {
      const formData = new FormData();
      formData.append('file', file);
      const res = await apiClient.post(API_PATHS.PROJECT_FILES(projectId), formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      return res.data;
    },
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: filesKey(variables.projectId) });
      queryClient.invalidateQueries({ queryKey: ['projects', variables.projectId] });
    },
  });
}

export function useDeleteFile() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ projectId, fileId }: { projectId: number; fileId: number }) => {
      await apiClient.delete(API_PATHS.PROJECT_FILE(projectId, fileId));
    },
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: filesKey(variables.projectId) });
    },
  });
}

export function useAnalyzeFile() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ projectId, fileId, ai_provider }: { projectId: number; fileId: number; ai_provider?: string }) => {
      const res = await apiClient.post(API_PATHS.PROJECT_FILE_ANALYZE(projectId, fileId), { ai_provider });
      return res.data;
    },
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: filesKey(variables.projectId) });
    },
  });
}
