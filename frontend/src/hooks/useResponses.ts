import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import apiClient from '@/api/client';
import { API_PATHS } from '@/utils/constants';
import type {
  SurveyResponse,
  ResponseListResponse,
  ManualEntryStartRequest,
  ManualEntrySubmitRequest,
} from '@/types/response';

const responsesKey = (projectId: number) => ['responses', projectId];

export function useResponses(projectId: number | undefined) {
  return useQuery<SurveyResponse[]>({
    queryKey: responsesKey(projectId!),
    queryFn: async () => {
      const res = await apiClient.get(API_PATHS.RESPONSES(projectId!));
      // Handle both paginated and flat array responses
      if (Array.isArray(res.data)) return res.data;
      return res.data.results ?? [];
    },
    enabled: !!projectId,
  });
}

export function useResponse(projectId: number | undefined, responseId: number | undefined) {
  return useQuery<SurveyResponse>({
    queryKey: [...responsesKey(projectId!), responseId],
    queryFn: async () => {
      const res = await apiClient.get<SurveyResponse>(API_PATHS.RESPONSE(projectId!, responseId!));
      return res.data;
    },
    enabled: !!projectId && !!responseId,
  });
}

export function useCloseCollection() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (projectId: number) => {
      await apiClient.post(API_PATHS.RESPONSES_CLOSE(projectId));
    },
    onSuccess: (_data, projectId) => {
      queryClient.invalidateQueries({ queryKey: responsesKey(projectId) });
      queryClient.invalidateQueries({ queryKey: ['projects', projectId] });
    },
  });
}

export function useStartManualEntry() {
  return useMutation({
    mutationFn: async ({
      projectId,
      employeeId,
    }: {
      projectId: number;
      employeeId: number;
    }) => {
      const res = await apiClient.post(
        API_PATHS.MANUAL_ENTRY_START(projectId),
        { employee_id: employeeId },
      );
      return res.data;
    },
  });
}

export function useSubmitManualEntry() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({
      projectId,
      data,
    }: {
      projectId: number;
      data: { response_id: number; answers: { question_id: number; text_value?: string; choice_values?: string[]; rating_value?: number | null }[] };
    }) => {
      const res = await apiClient.post(
        API_PATHS.MANUAL_ENTRY_SUBMIT(projectId),
        data,
      );
      return res.data;
    },
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: responsesKey(variables.projectId) });
    },
  });
}
