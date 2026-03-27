import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import apiClient from '@/api/client';
import { API_PATHS } from '@/utils/constants';
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
} from '@/types/distribution';

const employeesKey = (projectId: number) => ['employees', projectId];
const invitationsKey = (projectId: number) => ['invitations', projectId];

// --- Employee hooks ---

export function useEmployees(projectId: number | undefined) {
  return useQuery<Employee[]>({
    queryKey: employeesKey(projectId!),
    queryFn: async () => {
      const res = await apiClient.get<Employee[]>(API_PATHS.EMPLOYEES(projectId!));
      return res.data;
    },
    enabled: !!projectId,
  });
}

export function useCreateEmployee() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ projectId, data }: { projectId: number; data: EmployeeCreateRequest }) => {
      const res = await apiClient.post<Employee>(API_PATHS.EMPLOYEES(projectId), data);
      return res.data;
    },
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: employeesKey(variables.projectId) });
    },
  });
}

export function useBulkCreateEmployees() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ projectId, data }: { projectId: number; data: EmployeeBulkCreateRequest }) => {
      const res = await apiClient.post<EmployeeBulkCreateResponse>(API_PATHS.EMPLOYEES_BULK(projectId), data);
      return res.data;
    },
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: employeesKey(variables.projectId) });
    },
  });
}

export function useUpdateEmployee() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({
      projectId,
      employeeId,
      data,
    }: {
      projectId: number;
      employeeId: number;
      data: EmployeeUpdateRequest;
    }) => {
      const res = await apiClient.patch<Employee>(API_PATHS.EMPLOYEE(projectId, employeeId), data);
      return res.data;
    },
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: employeesKey(variables.projectId) });
    },
  });
}

export function useDeleteEmployee() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ projectId, employeeId }: { projectId: number; employeeId: number }) => {
      await apiClient.delete(API_PATHS.EMPLOYEE(projectId, employeeId));
    },
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: employeesKey(variables.projectId) });
    },
  });
}

// --- Invitation hooks ---

export function useInvitations(projectId: number | undefined) {
  return useQuery<InvitationListResponse>({
    queryKey: invitationsKey(projectId!),
    queryFn: async () => {
      const res = await apiClient.get<InvitationListResponse>(API_PATHS.INVITATIONS(projectId!));
      return res.data;
    },
    enabled: !!projectId,
  });
}

export function useGenerateInvitations() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ projectId, data }: { projectId: number; data: InvitationGenerateRequest }) => {
      const res = await apiClient.post<Invitation[]>(API_PATHS.INVITATIONS_GENERATE(projectId), data);
      return res.data;
    },
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: invitationsKey(variables.projectId) });
    },
  });
}

export function useSendInvitations() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ projectId, data }: { projectId: number; data?: InvitationSendRequest }) => {
      const res = await apiClient.post(API_PATHS.INVITATIONS_SEND(projectId), data ?? {});
      return res.data;
    },
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: invitationsKey(variables.projectId) });
    },
  });
}

export function useResendInvitation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ projectId, invitationId }: { projectId: number; invitationId: number }) => {
      const res = await apiClient.post(API_PATHS.INVITATION_RESEND(projectId, invitationId));
      return res.data;
    },
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: invitationsKey(variables.projectId) });
    },
  });
}
