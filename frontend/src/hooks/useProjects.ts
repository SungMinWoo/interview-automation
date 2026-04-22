import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import apiClient from '@/api/client';
import { API_PATHS } from '@/utils/constants';
import type { Project, ProjectCreateRequest, ProjectUpdateRequest } from '@/types/project';

const PROJECTS_KEY = ['projects'];

export function useProjects() {
  return useQuery<Project[]>({
    queryKey: PROJECTS_KEY,
    queryFn: async () => {
      const res = await apiClient.get(API_PATHS.PROJECTS);
      // pagination 비활성화 시 배열 직접 반환, 활성화 시 results 안에 있음
      if (Array.isArray(res.data)) return res.data;
      return res.data.results ?? [];
    },
  });
}

export function useProject(id: number | undefined) {
  return useQuery<Project>({
    queryKey: [...PROJECTS_KEY, id],
    queryFn: async () => {
      const res = await apiClient.get<Project>(API_PATHS.project(id!));
      return res.data;
    },
    enabled: !!id,
  });
}

export function useCreateProject() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (data: ProjectCreateRequest) => {
      const res = await apiClient.post<Project>(API_PATHS.PROJECTS, data);
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: PROJECTS_KEY });
    },
  });
}

export function useUpdateProject() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, data }: { id: number; data: ProjectUpdateRequest }) => {
      const res = await apiClient.patch<Project>(API_PATHS.project(id), data);
      return res.data;
    },
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: PROJECTS_KEY });
      queryClient.invalidateQueries({ queryKey: [...PROJECTS_KEY, variables.id] });
    },
  });
}

export function useDeleteProject() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: number) => {
      await apiClient.delete(API_PATHS.project(id));
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: PROJECTS_KEY });
    },
  });
}

export interface ProjectActivityItem {
  id: number;
  user_id: number | null;
  user_name: string;
  action: string;
  detail: Record<string, unknown>;
  created_at: string;
}

export function useProjectActivities(projectId: number | undefined) {
  return useQuery<ProjectActivityItem[]>({
    queryKey: ['project-activities', projectId],
    queryFn: async () => {
      const res = await apiClient.get(API_PATHS.PROJECT_ACTIVITIES(projectId!));
      return Array.isArray(res.data) ? res.data : res.data.results ?? [];
    },
    enabled: !!projectId,
  });
}
