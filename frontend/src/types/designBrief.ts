export type BriefStatus = 'draft' | 'generating' | 'completed' | 'finalized';

export interface BriefSection {
  id: number;
  title: string;
  content: string;
  order: number;
}

export interface DesignBrief {
  id: number;
  projectId: number;
  status: BriefStatus;
  title: string;
  summary?: string;
  sections: BriefSection[];
  projectGoals?: string;
  targetAudience?: string;
  designDirection?: string;
  keyRequirements?: string[];
  constraints?: string[];
  createdAt: string;
  updatedAt: string;
}

export interface BriefUpdateRequest {
  title?: string;
  summary?: string;
  sections?: Omit<BriefSection, 'id'>[];
  projectGoals?: string;
  targetAudience?: string;
  designDirection?: string;
  keyRequirements?: string[];
  constraints?: string[];
}

export type StitchStatus = 'pending' | 'processing' | 'completed' | 'failed';

export interface StitchGeneration {
  id: number;
  briefId: number;
  status: StitchStatus;
  generatedContent?: string;
  templateId?: number;
  configuration?: Record<string, unknown>;
  createdAt: string;
  updatedAt: string;
}

export interface StitchGenerateRequest {
  templateId?: number;
  configuration?: Record<string, unknown>;
}

export type ExportFormat = 'pdf' | 'docx' | 'html';

export interface ExportBriefRequest {
  format: ExportFormat;
}

export interface ExportBriefResponse {
  downloadUrl: string;
  fileName: string;
  format: ExportFormat;
}
