import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import apiClient from '@/api/client';
import { API_PATHS } from '@/utils/constants';
import type {
  SurveyResponse,
  ResponseListResponse,
  ManualEntryStartRequest,
  ManualEntrySubmitRequest,
  ManualDraft,
  EmployeeDraftsSummary,
  MergeAnswerInput,
} from '@/types/response';

const responsesKey = (projectId: number) => ['responses', projectId];
const draftMeKey = (projectId: number, employeeId: number) =>
  ['manual-draft-me', projectId, employeeId];
const employeeDraftsKey = (projectId: number, employeeId: number) =>
  ['manual-drafts', projectId, employeeId];
const employeeDraftsDetailKey = (projectId: number, employeeId: number) =>
  ['manual-drafts-detail', projectId, employeeId];

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

// ─── 멤버별 draft + 머지 ───

export function useMyManualDraft(projectId: number | undefined, employeeId: number | undefined) {
  return useQuery<ManualDraft | null>({
    queryKey: draftMeKey(projectId!, employeeId!),
    queryFn: async () => {
      const res = await apiClient.get(
        `/projects/${projectId}/manual-entry/drafts/me/?employee_id=${employeeId}`,
      );
      return res.data?.draft === null ? null : res.data;
    },
    enabled: !!projectId && !!employeeId,
  });
}

export function useEnsureMyManualDraft() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ projectId, employeeId }: { projectId: number; employeeId: number }) => {
      const res = await apiClient.post<ManualDraft>(
        `/projects/${projectId}/manual-entry/drafts/me/`,
        { employee_id: employeeId },
      );
      return res.data;
    },
    onSuccess: (data, { projectId, employeeId }) => {
      queryClient.setQueryData(draftMeKey(projectId, employeeId), data);
      queryClient.invalidateQueries({ queryKey: employeeDraftsKey(projectId, employeeId) });
    },
  });
}

export function useUpdateMyManualDraft() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({
      projectId,
      draftId,
      employeeId,
      answers,
    }: {
      projectId: number;
      draftId: number;
      employeeId: number;
      answers: MergeAnswerInput[];
    }) => {
      const res = await apiClient.patch<ManualDraft>(
        `/projects/${projectId}/manual-entry/drafts/${draftId}/`,
        { answers },
      );
      return res.data;
    },
    onSuccess: (data, { projectId, employeeId }) => {
      queryClient.setQueryData(draftMeKey(projectId, employeeId), data);
    },
  });
}

export function useSubmitMyManualDraft() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({
      projectId,
      draftId,
    }: {
      projectId: number;
      draftId: number;
      employeeId: number;
    }) => {
      const res = await apiClient.post<ManualDraft>(
        `/projects/${projectId}/manual-entry/drafts/${draftId}/submit/`,
      );
      return res.data;
    },
    onSuccess: (data, { projectId, employeeId }) => {
      queryClient.setQueryData(draftMeKey(projectId, employeeId), data);
      queryClient.invalidateQueries({ queryKey: employeeDraftsKey(projectId, employeeId) });
    },
  });
}

export function useEmployeeDrafts(projectId: number | undefined, employeeId: number | undefined) {
  return useQuery<EmployeeDraftsSummary>({
    queryKey: employeeDraftsKey(projectId!, employeeId!),
    queryFn: async () => {
      const res = await apiClient.get<EmployeeDraftsSummary>(
        `/projects/${projectId}/manual-entry/employees/${employeeId}/drafts/`,
      );
      return res.data;
    },
    enabled: !!projectId && !!employeeId,
  });
}

export function useEmployeeDraftsDetail(projectId: number | undefined, employeeId: number | undefined) {
  return useQuery<{ employee_id: number; employee_name: string; drafts: ManualDraft[] }>({
    queryKey: employeeDraftsDetailKey(projectId!, employeeId!),
    queryFn: async () => {
      const res = await apiClient.get(
        `/projects/${projectId}/manual-entry/employees/${employeeId}/drafts/detail/`,
      );
      return res.data;
    },
    enabled: !!projectId && !!employeeId,
  });
}

export function useAiMergeAnswer() {
  return useMutation({
    mutationFn: async ({
      projectId,
      employeeId,
      questionId,
      aiProvider,
    }: {
      projectId: number;
      employeeId: number;
      questionId: number;
      aiProvider?: 'claude' | 'gemini';
    }) => {
      const res = await apiClient.post<{
        question_id: number;
        merged_text: string;
        source_count: number;
        ai_provider: string;
      }>(
        `/projects/${projectId}/manual-entry/employees/${employeeId}/ai-merge/`,
        { question_id: questionId, ai_provider: aiProvider },
      );
      return res.data;
    },
  });
}

export function useMergeManualEntry() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({
      projectId,
      employeeId,
      answers,
    }: {
      projectId: number;
      employeeId: number;
      answers: MergeAnswerInput[];
    }) => {
      const res = await apiClient.post(
        `/projects/${projectId}/manual-entry/employees/${employeeId}/merge/`,
        { answers },
      );
      return res.data;
    },
    onSuccess: (_data, { projectId, employeeId }) => {
      queryClient.invalidateQueries({ queryKey: responsesKey(projectId) });
      queryClient.invalidateQueries({ queryKey: employeeDraftsKey(projectId, employeeId) });
    },
  });
}
