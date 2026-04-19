import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import apiClient from '@/api/client';
import { API_PATHS } from '@/utils/constants';
import type {
  Questionnaire,
  QuestionnaireStatusResponse,
  Question,
  QuestionCreateRequest,
  QuestionUpdateRequest,
} from '@/types/questionnaire';

const questionnaireKey = (projectId: number) => ['questionnaire', projectId];
const questionnaireStatusKey = (projectId: number) => ['questionnaire', projectId, 'status'];

export function useQuestionnaire(projectId: number | undefined) {
  return useQuery<Questionnaire>({
    queryKey: questionnaireKey(projectId!),
    queryFn: async () => {
      const res = await apiClient.get<Questionnaire>(API_PATHS.QUESTIONNAIRE(projectId!));
      return res.data;
    },
    enabled: !!projectId,
  });
}

export function useQuestionnaireStatus(projectId: number | undefined, enabled: boolean = false) {
  return useQuery<QuestionnaireStatusResponse>({
    queryKey: questionnaireStatusKey(projectId!),
    queryFn: async () => {
      const res = await apiClient.get<QuestionnaireStatusResponse>(API_PATHS.QUESTIONNAIRE_STATUS(projectId!));
      return res.data;
    },
    enabled: !!projectId && enabled,
    refetchInterval: (query) => {
      const data = query.state.data;
      return data?.status === 'processing' ? 3000 : false;
    },
  });
}

export function useGenerateQuestionnaire() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ projectId, ai_provider, reference_project_ids }: { projectId: number; ai_provider?: string; reference_project_ids?: number[] }) => {
      const res = await apiClient.post<Questionnaire>(API_PATHS.QUESTIONNAIRE_GENERATE(projectId), {
        ai_provider,
        reference_project_ids,
      });
      return res.data;
    },
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: questionnaireKey(variables.projectId) });
      queryClient.invalidateQueries({ queryKey: questionnaireStatusKey(variables.projectId) });
    },
  });
}

export function useConfirmQuestionnaire() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (projectId: number) => {
      const res = await apiClient.post<Questionnaire>(API_PATHS.QUESTIONNAIRE_CONFIRM(projectId));
      return res.data;
    },
    onSuccess: (_data, projectId) => {
      queryClient.invalidateQueries({ queryKey: questionnaireKey(projectId) });
    },
  });
}

export function useUpdateQuestion() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({
      projectId,
      questionId,
      data,
    }: {
      projectId: number;
      questionId: number;
      data: QuestionUpdateRequest;
    }) => {
      const res = await apiClient.patch<Question>(API_PATHS.QUESTION(projectId, questionId), data);
      return res.data;
    },
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: questionnaireKey(variables.projectId) });
    },
  });
}

export function useCreateQuestion() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ projectId, data }: { projectId: number; data: QuestionCreateRequest }) => {
      const res = await apiClient.post<Question>(API_PATHS.QUESTIONS(projectId), data);
      return res.data;
    },
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: questionnaireKey(variables.projectId) });
    },
  });
}

export function useDeleteQuestion() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ projectId, questionId }: { projectId: number; questionId: number }) => {
      await apiClient.delete(API_PATHS.QUESTION(projectId, questionId));
    },
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: questionnaireKey(variables.projectId) });
    },
  });
}

export function useReorderQuestions() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ projectId, data }: { projectId: number; data: { id: number; order: number }[] }) => {
      await apiClient.post(API_PATHS.QUESTIONS_REORDER(projectId), data);
    },
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: questionnaireKey(variables.projectId) });
    },
  });
}

// --- Section hooks ---

export function useCreateSection() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ projectId, data }: { projectId: number; data: { title: string; description?: string; importance?: string; target_area?: string } }) => {
      const res = await apiClient.post(API_PATHS.QUESTIONNAIRE_SECTIONS(projectId), data);
      return res.data;
    },
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: questionnaireKey(variables.projectId) });
    },
  });
}

export function useDeleteSection() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ projectId, sectionId }: { projectId: number; sectionId: number }) => {
      await apiClient.delete(API_PATHS.QUESTIONNAIRE_SECTION(projectId, sectionId));
    },
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: questionnaireKey(variables.projectId) });
    },
  });
}

export function useGenerateSectionQuestions() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ projectId, sectionId, count, ai_provider }: { projectId: number; sectionId: number; count: number; ai_provider?: string }) => {
      const res = await apiClient.post(API_PATHS.QUESTIONNAIRE_SECTION_GENERATE(projectId, sectionId), { count, ai_provider });
      return res.data;
    },
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: questionnaireKey(variables.projectId) });
    },
  });
}

// --- Template / Import hooks ---

export interface QuestionnaireTemplate {
  project_id: number;
  project_title: string;
  client_name: string;
  questionnaire_id: number;
  title: string;
  status: string;
  section_count: number;
  question_count: number;
}

export function useQuestionnaireTemplates(projectId: number | undefined) {
  return useQuery<QuestionnaireTemplate[]>({
    queryKey: ['questionnaire-templates', projectId],
    queryFn: async () => {
      const res = await apiClient.get(API_PATHS.QUESTIONNAIRE_TEMPLATES(projectId!));
      return res.data;
    },
    enabled: !!projectId,
  });
}

export function useImportQuestionnaire() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ projectId, sourceProjectId }: { projectId: number; sourceProjectId: number }) => {
      const res = await apiClient.post(API_PATHS.QUESTIONNAIRE_IMPORT(projectId), { source_project_id: sourceProjectId });
      return res.data;
    },
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: questionnaireKey(variables.projectId) });
    },
  });
}

