import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import apiClient from '@/api/client';
import { API_PATHS } from '@/utils/constants';
import type { ProjectDepartment, ProjectPosition } from '@/types/project';

const deptKey = (projectId: number) => ['departments', projectId];
const posKey = (projectId: number) => ['positions', projectId];

export function useDepartments(projectId: number | undefined) {
  return useQuery<ProjectDepartment[]>({
    queryKey: deptKey(projectId!),
    queryFn: async () => {
      const res = await apiClient.get(API_PATHS.DEPARTMENTS(projectId!));
      if (Array.isArray(res.data)) return res.data;
      return res.data.results ?? [];
    },
    enabled: !!projectId,
  });
}

export function useCreateDepartment() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ projectId, data }: { projectId: number; data: { name: string } }) => {
      const res = await apiClient.post(API_PATHS.DEPARTMENTS(projectId), data);
      return res.data;
    },
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: deptKey(variables.projectId) });
      queryClient.invalidateQueries({ queryKey: ['projects', variables.projectId] });
    },
  });
}

export function useDeleteDepartment() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ projectId, deptId }: { projectId: number; deptId: number }) => {
      await apiClient.delete(API_PATHS.DEPARTMENT(projectId, deptId));
    },
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: deptKey(variables.projectId) });
      queryClient.invalidateQueries({ queryKey: ['projects', variables.projectId] });
    },
  });
}

export function usePositions(projectId: number | undefined) {
  return useQuery<ProjectPosition[]>({
    queryKey: posKey(projectId!),
    queryFn: async () => {
      const res = await apiClient.get(API_PATHS.POSITIONS(projectId!));
      if (Array.isArray(res.data)) return res.data;
      return res.data.results ?? [];
    },
    enabled: !!projectId,
  });
}

export function useCreatePosition() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ projectId, data }: { projectId: number; data: { name: string; weight?: number } }) => {
      const res = await apiClient.post(API_PATHS.POSITIONS(projectId), data);
      return res.data;
    },
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: posKey(variables.projectId) });
      queryClient.invalidateQueries({ queryKey: ['projects', variables.projectId] });
    },
  });
}

export function useDeletePosition() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ projectId, posId }: { projectId: number; posId: number }) => {
      await apiClient.delete(API_PATHS.POSITION(projectId, posId));
    },
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: posKey(variables.projectId) });
      queryClient.invalidateQueries({ queryKey: ['projects', variables.projectId] });
    },
  });
}
