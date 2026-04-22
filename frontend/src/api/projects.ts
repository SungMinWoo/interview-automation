import apiClient from './client';
import type {
  Project,
  ProjectCreateRequest,
  ProjectUpdateRequest,
  ReferenceSite,
  ReferenceSiteCreateRequest,
  ReferenceSiteUpdateRequest,
} from '../types/project';

// Projects
export const getProjects = async (): Promise<Project[]> => {
  const response = await apiClient.get('/projects/');
  if (Array.isArray(response.data)) return response.data;
  return response.data.results ?? [];
};

export const getProject = async (id: number): Promise<Project> => {
  const response = await apiClient.get<Project>(`/projects/${id}/`);
  return response.data;
};

export const createProject = async (data: ProjectCreateRequest): Promise<Project> => {
  const response = await apiClient.post<Project>('/projects/', data);
  return response.data;
};

export const updateProject = async (id: number, data: ProjectUpdateRequest): Promise<Project> => {
  const response = await apiClient.patch<Project>(`/projects/${id}/`, data);
  return response.data;
};

export const deleteProject = async (id: number): Promise<void> => {
  await apiClient.delete(`/projects/${id}/`);
};

// Reference Sites
export const getReferenceSites = async (projectId: number): Promise<ReferenceSite[]> => {
  const response = await apiClient.get<ReferenceSite[]>(`/projects/${projectId}/reference-sites/`);
  return response.data;
};

export const createReferenceSite = async (
  projectId: number,
  data: ReferenceSiteCreateRequest,
): Promise<ReferenceSite> => {
  const response = await apiClient.post<ReferenceSite>(`/projects/${projectId}/reference-sites/`, data);
  return response.data;
};

export const updateReferenceSite = async (
  projectId: number,
  siteId: number,
  data: ReferenceSiteUpdateRequest,
): Promise<ReferenceSite> => {
  const response = await apiClient.patch<ReferenceSite>(
    `/projects/${projectId}/reference-sites/${siteId}/`,
    data,
  );
  return response.data;
};

export const deleteReferenceSite = async (projectId: number, siteId: number): Promise<void> => {
  await apiClient.delete(`/projects/${projectId}/reference-sites/${siteId}/`);
};
