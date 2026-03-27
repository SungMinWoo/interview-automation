import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import apiClient from '@/api/client';
import { API_PATHS } from '@/utils/constants';
import type {
  Questionnaire,
  Question,
  QuestionCreateRequest,
  QuestionUpdateRequest,
  QuestionReorderRequest,
  PositionCategory,
  PositionCategoryCreateRequest,
  PositionCategoryUpdateRequest,
} from '@/types/questionnaire';

const questionnaireKey = (projectId: number) => ['questionnaire', projectId];
const categoriesKey = (projectId: number) => ['questionnaire', projectId, 'categories'];

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

export function useGenerateQuestionnaire() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (projectId: number) => {
      const res = await apiClient.post<Questionnaire>(API_PATHS.QUESTIONNAIRE_GENERATE(projectId));
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
    mutationFn: async ({ projectId, data }: { projectId: number; data: QuestionReorderRequest }) => {
      await apiClient.post(API_PATHS.QUESTIONS_REORDER(projectId), data);
    },
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: questionnaireKey(variables.projectId) });
    },
  });
}

// --- Position Category hooks ---

export function usePositionCategories(projectId: number | undefined) {
  return useQuery<PositionCategory[]>({
    queryKey: categoriesKey(projectId!),
    queryFn: async () => {
      const res = await apiClient.get<PositionCategory[]>(API_PATHS.POSITION_CATEGORIES(projectId!));
      return res.data;
    },
    enabled: !!projectId,
  });
}

export function useCreatePositionCategory() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ projectId, data }: { projectId: number; data: PositionCategoryCreateRequest }) => {
      const res = await apiClient.post<PositionCategory>(API_PATHS.POSITION_CATEGORIES(projectId), data);
      return res.data;
    },
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: categoriesKey(variables.projectId) });
      queryClient.invalidateQueries({ queryKey: questionnaireKey(variables.projectId) });
    },
  });
}

export function useUpdatePositionCategory() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({
      projectId,
      categoryId,
      data,
    }: {
      projectId: number;
      categoryId: number;
      data: PositionCategoryUpdateRequest;
    }) => {
      const res = await apiClient.patch<PositionCategory>(
        API_PATHS.POSITION_CATEGORY(projectId, categoryId),
        data,
      );
      return res.data;
    },
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: categoriesKey(variables.projectId) });
    },
  });
}

export function useDeletePositionCategory() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ projectId, categoryId }: { projectId: number; categoryId: number }) => {
      await apiClient.delete(API_PATHS.POSITION_CATEGORY(projectId, categoryId));
    },
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: categoriesKey(variables.projectId) });
      queryClient.invalidateQueries({ queryKey: questionnaireKey(variables.projectId) });
    },
  });
}
