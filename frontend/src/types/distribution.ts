export interface Employee {
  id: number;
  projectId: number;
  name: string;
  email: string;
  department?: string;
  position?: string;
  positionCategoryId?: number;
  createdAt: string;
  updatedAt: string;
}

export interface EmployeeCreateRequest {
  name: string;
  email: string;
  department?: string;
  position?: string;
  positionCategoryId?: number;
}

export interface EmployeeUpdateRequest {
  name?: string;
  email?: string;
  department?: string;
  position?: string;
  positionCategoryId?: number;
}

export interface EmployeeBulkCreateRequest {
  employees: EmployeeCreateRequest[];
}

export interface EmployeeBulkCreateResponse {
  created: number;
  errors: Array<{
    row: number;
    message: string;
  }>;
}

export type InvitationStatus = 'pending' | 'sent' | 'opened' | 'completed' | 'failed' | 'expired';

export interface Invitation {
  id: number;
  projectId: number;
  employeeId: number;
  employeeName: string;
  employeeEmail: string;
  token: string;
  status: InvitationStatus;
  sentAt?: string;
  openedAt?: string;
  completedAt?: string;
  expiresAt?: string;
  createdAt: string;
  updatedAt: string;
}

export interface InvitationGenerateRequest {
  employeeIds?: number[];
  expiresInDays?: number;
}

export interface InvitationSendRequest {
  invitationIds?: number[];
}

export interface InvitationListResponse {
  count: number;
  next: string | null;
  previous: string | null;
  results: Invitation[];
}
