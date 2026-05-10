export interface ReferenceSite {
  id: number;
  url: string;
  title: string;
  description: string;
  screenshot_path: string;
  crawl_data: Record<string, unknown>;
  order: number;
  created_at: string;
}

export interface ReferenceSiteCreateRequest {
  url: string;
  title?: string;
  description?: string;
}

export interface ReferenceSiteUpdateRequest {
  url?: string;
  title?: string;
  description?: string;
  order?: number;
}

export interface ProjectDepartment {
  id: number;
  name: string;
  order: number;
}

export interface ProjectPosition {
  id: number;
  name: string;
  weight: number;
  order: number;
}

export interface ProjectFile {
  id: number;
  file: string;
  original_name: string;
  file_type: string;
  file_size: number;
  extracted_text: string;
  ai_summary: string;
  created_at: string;
}

export type ProjectType = 'uxui' | 'bx';

export interface Project {
  id: number;
  project_type: ProjectType;
  title: string;
  client_name: string;
  client_contact_email: string;
  client_contact_phone: string;
  requirements_text: string;
  existing_site_url: string | null;
  status: ProjectStatus;
  reference_sites: ReferenceSite[];
  reference_sites_count?: number;
  files?: ProjectFile[];
  departments?: ProjectDepartment[];
  positions?: ProjectPosition[];
  my_role?: 'owner' | 'admin' | 'editor' | 'viewer' | null;
  owner_name?: string | null;
  owner_email?: string | null;
  created_at: string;
  updated_at: string;
}

export type ProjectStatus =
  | 'created'
  | 'analyzing'
  | 'analysis_ready'
  | 'analysis_confirmed'
  | 'questionnaire_ready'
  | 'distributing'
  | 'collecting'
  | 'closed'
  | 'aggregating'
  | 'aggregation_ready'
  | 'brief_ready'
  | 'completed';

export interface ProjectCreateRequest {
  title: string;
  project_type?: ProjectType;
  client_name: string;
  client_contact_email?: string;
  client_contact_phone?: string;
  requirements_text: string;
  existing_site_url?: string;
  reference_sites?: ReferenceSiteCreateRequest[];
}

export interface ProjectUpdateRequest {
  title?: string;
  client_name?: string;
  client_contact_email?: string;
  client_contact_phone?: string;
  requirements_text?: string;
  existing_site_url?: string;
}

export interface ProjectListResponse {
  count: number;
  next: string | null;
  previous: string | null;
  results: Project[];
}
