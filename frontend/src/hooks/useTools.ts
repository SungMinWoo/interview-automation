import { useMutation } from '@tanstack/react-query';
import apiClient from '@/api/client';
import { API_PATHS } from '@/utils/constants';

export interface SiteAnalysisResult {
  url: string;
  crawl: {
    title: string;
    meta_description: string;
    headings: { level: number; text: string }[];
    navigation: { text: string; href: string }[];
  };
  analysis: Record<string, unknown>;
  ai_provider: string;
}

export interface FileAnalysisResult {
  file_name: string;
  file_type: string;
  file_size: number;
  extracted_text: string;
  analysis: Record<string, unknown>;
  ai_provider: string;
}

export function useAnalyzeSite() {
  return useMutation<SiteAnalysisResult>({
    mutationFn: async ({ url, ai_provider }: { url: string; ai_provider?: string }) => {
      const res = await apiClient.post(API_PATHS.TOOLS_ANALYZE_SITE, { url, ai_provider });
      return res.data;
    },
  });
}

export function useAnalyzeFileTool() {
  return useMutation<FileAnalysisResult>({
    mutationFn: async ({ file, ai_provider }: { file: File; ai_provider?: string }) => {
      const formData = new FormData();
      formData.append('file', file);
      if (ai_provider) formData.append('ai_provider', ai_provider);
      const res = await apiClient.post(API_PATHS.TOOLS_ANALYZE_FILE, formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      return res.data;
    },
  });
}
