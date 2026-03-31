export type AnalysisStatus = 'pending' | 'processing' | 'completed' | 'confirmed' | 'failed';
export type AiProvider = 'claude' | 'gemini';

export interface AnalysisResult {
  id: number;
  project: number;
  status: AnalysisStatus;
  ai_provider: AiProvider;
  requirements_summary: string;
  existing_site_analysis: Record<string, unknown>;
  reference_sites_analysis: Record<string, unknown>;
  combined_insights: Record<string, unknown>;
  user_edits: Record<string, unknown>;
  confirmed_at: string | null;
  raw_ai_response: Record<string, unknown>;
  error_message: string;
  created_at: string;
  updated_at: string;
}

export interface AnalysisUpdateRequest {
  user_edits?: Record<string, unknown>;
  requirements_summary?: string;
  existing_site_analysis?: Record<string, unknown>;
  reference_sites_analysis?: Record<string, unknown>;
  combined_insights?: Record<string, unknown>;
}

export interface AnalysisStatusResponse {
  id: number;
  status: AnalysisStatus;
  ai_provider: AiProvider;
  error_message?: string;
  updated_at?: string;
}
