import apiClient from './client';
import type {
  Employee,
  EmployeeCreateRequest,
  EmployeeUpdateRequest,
  EmployeeBulkCreateRequest,
  EmployeeBulkCreateResponse,
  Invitation,
  InvitationGenerateRequest,
  InvitationSendRequest,
  InvitationListResponse,
} from '../types/distribution';

// Employees
export const getEmployees = async (projectId: number): Promise<Employee[]> => {
  const response = await apiClient.get<Employee[]>(`/projects/${projectId}/employees/`);
  return response.data;
};

export const createEmployee = async (
  projectId: number,
  data: EmployeeCreateRequest,
): Promise<Employee> => {
  const response = await apiClient.post<Employee>(`/projects/${projectId}/employees/`, data);
  return response.data;
};

export const updateEmployee = async (
  projectId: number,
  employeeId: number,
  data: EmployeeUpdateRequest,
): Promise<Employee> => {
  const response = await apiClient.patch<Employee>(
    `/projects/${projectId}/employees/${employeeId}/`,
    data,
  );
  return response.data;
};

export const deleteEmployee = async (projectId: number, employeeId: number): Promise<void> => {
  await apiClient.delete(`/projects/${projectId}/employees/${employeeId}/`);
};

export const bulkCreateEmployees = async (
  projectId: number,
  data: EmployeeBulkCreateRequest,
): Promise<EmployeeBulkCreateResponse> => {
  const response = await apiClient.post<EmployeeBulkCreateResponse>(
    `/projects/${projectId}/employees/bulk/`,
    data,
  );
  return response.data;
};

// Invitations
export const generateInvitations = async (
  projectId: number,
  data?: InvitationGenerateRequest,
): Promise<Invitation[]> => {
  const response = await apiClient.post<Invitation[]>(
    `/projects/${projectId}/invitations/generate/`,
    data,
  );
  return response.data;
};

export const sendInvitations = async (
  projectId: number,
  data?: InvitationSendRequest,
): Promise<void> => {
  await apiClient.post(`/projects/${projectId}/invitations/send/`, data);
};

export const getInvitations = async (projectId: number): Promise<InvitationListResponse> => {
  const response = await apiClient.get<InvitationListResponse>(
    `/projects/${projectId}/invitations/`,
  );
  return response.data;
};

export const resendInvitation = async (
  projectId: number,
  invitationId: number,
): Promise<void> => {
  await apiClient.post(`/projects/${projectId}/invitations/${invitationId}/resend/`);
};
