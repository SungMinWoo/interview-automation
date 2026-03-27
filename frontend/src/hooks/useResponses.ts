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
  return useQuery<ResponseListResponse>({
    queryKey: responsesKey(projectId!),
    queryFn: async () => {
      const res = await apiClient.get<ResponseListResponse>(API_PATHS.RESPONSES(projectId!));
      return res.data;
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
      data,
    }: {
      projectId: number;
      employeeId: number;
      data: ManualEntryStartRequest;
    }) => {
      const res = await apiClient.post<SurveyResponse>(
        API_PATHS.MANUAL_ENTRY_START(projectId, employeeId),
        data,
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
      employeeId,
      data,
    }: {
      projectId: number;
      employeeId: number;
      data: ManualEntrySubmitRequest;
    }) => {
      const res = await apiClient.post<SurveyResponse>(
        API_PATHS.MANUAL_ENTRY_SUBMIT(projectId, employeeId),
        data,
      );
      return res.data;
    },
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: responsesKey(variables.projectId) });
    },
  });
}
