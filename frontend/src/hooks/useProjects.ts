import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import apiClient from '@/api/client';
import { API_PATHS } from '@/utils/constants';
import type { Project, ProjectCreateRequest, ProjectUpdateRequest, ProjectListResponse } from '@/types/project';

const PROJECTS_KEY = ['projects'];

export function useProjects() {
  return useQuery<ProjectListResponse>({
    queryKey: PROJECTS_KEY,
    queryFn: async () => {
      const res = await apiClient.get<ProjectListResponse>(API_PATHS.PROJECTS);
      return res.data;
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
