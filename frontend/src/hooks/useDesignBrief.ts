import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import apiClient from '@/api/client';
import { API_PATHS } from '@/utils/constants';
import type {
  DesignBrief,
  BriefUpdateRequest,
  StitchGeneration,
  StitchGenerateRequest,
  ExportBriefRequest,
  ExportBriefResponse,
} from '@/types/designBrief';

const briefKey = (projectId: number) => ['brief', projectId];
const stitchKey = (projectId: number) => ['brief', projectId, 'stitch'];

export function useDesignBrief(projectId: number | undefined) {
  return useQuery<DesignBrief | null>({
    queryKey: briefKey(projectId!),
    queryFn: async () => {
      try {
        const res = await apiClient.get<DesignBrief>(API_PATHS.BRIEF(projectId!));
        return res.data;
      } catch (err: any) {
        if (err?.response?.status === 404) return null;
        throw err;
      }
    },
    enabled: !!projectId,
  });
}

export function useCompileBrief() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (projectId: number) => {
      const res = await apiClient.post<DesignBrief>(API_PATHS.BRIEF_COMPILE(projectId));
      return res.data;
    },
    onSuccess: (_data, projectId) => {
      queryClient.invalidateQueries({ queryKey: briefKey(projectId) });
    },
  });
}

export function useUpdateBrief() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ projectId, data }: { projectId: number; data: BriefUpdateRequest }) => {
      const res = await apiClient.patch<DesignBrief>(API_PATHS.BRIEF(projectId), data);
      return res.data;
    },
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: briefKey(variables.projectId) });
    },
  });
}

// --- Stitch hooks ---

export function useStitchGenerations(projectId: number | undefined) {
  return useQuery<StitchGeneration[]>({
    queryKey: stitchKey(projectId!),
    queryFn: async () => {
      try {
        const res = await apiClient.get(API_PATHS.STITCH_LIST(projectId!));
        if (Array.isArray(res.data)) return res.data;
        return res.data.results ?? [];
      } catch (err: any) {
        if (err?.response?.status === 404) return [];
        throw err;
      }
    },
    enabled: !!projectId,
  });
}

export function useStitchDetail(projectId: number | undefined, stitchId: number | undefined) {
  return useQuery<StitchGeneration>({
    queryKey: [...stitchKey(projectId!), stitchId],
    queryFn: async () => {
      const res = await apiClient.get<StitchGeneration>(API_PATHS.STITCH_DETAIL(projectId!, stitchId!));
      return res.data;
    },
    enabled: !!projectId && !!stitchId,
  });
}

export function useTriggerStitch() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ projectId }: { projectId: number }) => {
      const res = await apiClient.post<StitchGeneration>(API_PATHS.STITCH_GENERATE(projectId), {});
      return res.data;
    },
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: stitchKey(variables.projectId) });
    },
  });
}

export function useRegenerateStitch() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ projectId, stitchId }: { projectId: number; stitchId: number }) => {
      const res = await apiClient.post<StitchGeneration>(API_PATHS.STITCH_REGENERATE(projectId, stitchId), {});
      return res.data;
    },
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: stitchKey(variables.projectId) });
    },
  });
}

export function useFetchStitchScreens() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ projectId, generationId }: { projectId: number; generationId: number }) => {
      const res = await apiClient.post(API_PATHS.STITCH_FETCH(projectId, generationId));
      return res.data;
    },
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: stitchKey(variables.projectId) });
      queryClient.invalidateQueries({ queryKey: briefKey(variables.projectId) });
    },
  });
}

export function useExportBrief() {
  return useMutation({
    mutationFn: async ({ projectId, data }: { projectId: number; data: ExportBriefRequest }) => {
      const res = await apiClient.post<ExportBriefResponse>(API_PATHS.BRIEF_EXPORT(projectId), data);
      return res.data;
    },
  });
}

export function useGenerateDesignMd() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ projectId, ai_provider }: { projectId: number; ai_provider?: string }) => {
      const res = await apiClient.post(API_PATHS.DESIGN_MD_GENERATE(projectId), { ai_provider });
      return res.data as { design_md: string; ai_provider: string };
    },
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: briefKey(variables.projectId) });
    },
  });
}

export function downloadDesignMd(projectId: number) {
  const url = `${apiClient.defaults.baseURL}${API_PATHS.DESIGN_MD_DOWNLOAD(projectId)}`;
  window.open(url, '_blank');
}
