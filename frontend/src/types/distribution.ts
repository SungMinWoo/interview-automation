export interface Employee {
  id: number;
  project: number;
  name: string;
  email: string;
  phone?: string;
  department?: string;
  position?: string;
  position_category?: number | null;
  created_at: string;
}

export interface EmployeeCreateRequest {
  name: string;
  email: string;
  phone?: string;
  department?: string;
  position?: string;
}

export interface EmployeeUpdateRequest {
  name?: string;
  email?: string;
  phone?: string;
  department?: string;
  position?: string;
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
  employee: number;
  employee_name: string;
  employee_email: string;
  employee_position: string;
  token: string;
  survey_url: string;
  status: InvitationStatus;
  expires_at: string;
  sent_at?: string | null;
  opened_at?: string | null;
  completed_at?: string | null;
  is_manual_entry: boolean;
  is_expired: boolean;
  /** 응답 완료 전까지 노출되는 평문 비밀번호. 완료 후엔 빈 문자열. */
  password_plain?: string;
  created_at: string;
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
