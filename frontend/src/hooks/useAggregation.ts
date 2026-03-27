import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import apiClient from '@/api/client';
import { API_PATHS } from '@/utils/constants';
import type {
  Aggregation,
  AggregationStatusResponse,
  Keyword,
  KeywordCreateRequest,
  KeywordUpdateRequest,
  Sentence,
  SentenceCreateRequest,
  SentenceUpdateRequest,
} from '@/types/aggregation';

const aggregationKey = (projectId: number) => ['aggregation', projectId];
const aggregationStatusKey = (projectId: number) => ['aggregation', projectId, 'status'];
const keywordsKey = (projectId: number) => ['aggregation', projectId, 'keywords'];
const sentencesKey = (projectId: number) => ['aggregation', projectId, 'sentences'];

export function useAggregation(projectId: number | undefined) {
  return useQuery<Aggregation>({
    queryKey: aggregationKey(projectId!),
    queryFn: async () => {
      const res = await apiClient.get<Aggregation>(API_PATHS.AGGREGATION(projectId!));
      return res.data;
    },
    enabled: !!projectId,
  });
}

export function useAggregationStatus(projectId: number | undefined, enabled: boolean = false) {
  return useQuery<AggregationStatusResponse>({
    queryKey: aggregationStatusKey(projectId!),
    queryFn: async () => {
      const res = await apiClient.get<AggregationStatusResponse>(API_PATHS.AGGREGATION_STATUS(projectId!));
      return res.data;
    },
    enabled: !!projectId && enabled,
    refetchInterval: (query) => {
      const data = query.state.data;
      return data?.status === 'processing' ? 3000 : false;
    },
  });
}

export function useTriggerAggregation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (projectId: number) => {
      const res = await apiClient.post(API_PATHS.AGGREGATION_TRIGGER(projectId));
      return res.data;
    },
    onSuccess: (_data, projectId) => {
      queryClient.invalidateQueries({ queryKey: aggregationKey(projectId) });
      queryClient.invalidateQueries({ queryKey: aggregationStatusKey(projectId) });
    },
  });
}

export function useRegenerateAggregation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (projectId: number) => {
      const res = await apiClient.post(API_PATHS.AGGREGATION_REGENERATE(projectId));
      return res.data;
    },
    onSuccess: (_data, projectId) => {
      queryClient.invalidateQueries({ queryKey: aggregationKey(projectId) });
      queryClient.invalidateQueries({ queryKey: aggregationStatusKey(projectId) });
    },
  });
}

// --- Keyword hooks ---

export function useKeywords(projectId: number | undefined) {
  return useQuery<Keyword[]>({
    queryKey: keywordsKey(projectId!),
    queryFn: async () => {
      const res = await apiClient.get<Keyword[]>(API_PATHS.KEYWORDS(projectId!));
      return res.data;
    },
    enabled: !!projectId,
  });
}

export function useCreateKeyword() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ projectId, data }: { projectId: number; data: KeywordCreateRequest }) => {
      const res = await apiClient.post<Keyword>(API_PATHS.KEYWORDS(projectId), data);
      return res.data;
    },
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: keywordsKey(variables.projectId) });
      queryClient.invalidateQueries({ queryKey: aggregationKey(variables.projectId) });
    },
  });
}

export function useUpdateKeyword() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({
      projectId,
      keywordId,
      data,
    }: {
      projectId: number;
      keywordId: number;
      data: KeywordUpdateRequest;
    }) => {
      const res = await apiClient.patch<Keyword>(API_PATHS.KEYWORD(projectId, keywordId), data);
      return res.data;
    },
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: keywordsKey(variables.projectId) });
    },
  });
}

export function useDeleteKeyword() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ projectId, keywordId }: { projectId: number; keywordId: number }) => {
      await apiClient.delete(API_PATHS.KEYWORD(projectId, keywordId));
    },
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: keywordsKey(variables.projectId) });
      queryClient.invalidateQueries({ queryKey: aggregationKey(variables.projectId) });
    },
  });
}

export function useGenerateKeywords() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (projectId: number) => {
      const res = await apiClient.post(API_PATHS.KEYWORDS_GENERATE(projectId));
      return res.data;
    },
    onSuccess: (_data, projectId) => {
      queryClient.invalidateQueries({ queryKey: keywordsKey(projectId) });
      queryClient.invalidateQueries({ queryKey: aggregationKey(projectId) });
    },
  });
}

// --- Sentence hooks ---

export function useSentences(projectId: number | undefined) {
  return useQuery<Sentence[]>({
    queryKey: sentencesKey(projectId!),
    queryFn: async () => {
      const res = await apiClient.get<Sentence[]>(API_PATHS.SENTENCES(projectId!));
      return res.data;
    },
    enabled: !!projectId,
  });
}

export function useCreateSentence() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ projectId, data }: { projectId: number; data: SentenceCreateRequest }) => {
      const res = await apiClient.post<Sentence>(API_PATHS.SENTENCES(projectId), data);
      return res.data;
    },
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: sentencesKey(variables.projectId) });
      queryClient.invalidateQueries({ queryKey: aggregationKey(variables.projectId) });
    },
  });
}

export function useUpdateSentence() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({
      projectId,
      sentenceId,
      data,
    }: {
      projectId: number;
      sentenceId: number;
      data: SentenceUpdateRequest;
    }) => {
      const res = await apiClient.patch<Sentence>(API_PATHS.SENTENCE(projectId, sentenceId), data);
      return res.data;
    },
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: sentencesKey(variables.projectId) });
    },
  });
}

export function useDeleteSentence() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ projectId, sentenceId }: { projectId: number; sentenceId: number }) => {
      await apiClient.delete(API_PATHS.SENTENCE(projectId, sentenceId));
    },
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: sentencesKey(variables.projectId) });
      queryClient.invalidateQueries({ queryKey: aggregationKey(variables.projectId) });
    },
  });
}
