import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import apiClient from '@/api/client';
import { API_PATHS } from '@/utils/constants';
import { useAuthStore } from '@/store/authStore';
import type { ProjectMember, MemberRole, AddMemberRequest, UpdateMemberRoleRequest, TransferOwnershipRequest } from '@/types/member';
import type { UserSearchResult } from '@/types/auth';

const MEMBERS_KEY = (projectId: number) => ['project-members', projectId];

export function useMembers(projectId: number | undefined) {
  return useQuery<ProjectMember[]>({
    queryKey: MEMBERS_KEY(projectId!),
    queryFn: async () => {
      const res = await apiClient.get<ProjectMember[]>(API_PATHS.MEMBERS(projectId!));
      return res.data;
    },
    enabled: !!projectId,
  });
}

export function useAddMember() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ projectId, data }: { projectId: number; data: AddMemberRequest }) => {
      const res = await apiClient.post<ProjectMember>(API_PATHS.MEMBERS(projectId), data);
      return res.data;
    },
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: MEMBERS_KEY(variables.projectId) });
    },
  });
}

export function useUpdateMemberRole() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({
      projectId,
      memberId,
      data,
    }: {
      projectId: number;
      memberId: number;
      data: UpdateMemberRoleRequest;
    }) => {
      const res = await apiClient.patch<ProjectMember>(
        API_PATHS.MEMBER(projectId, memberId),
        data,
      );
      return res.data;
    },
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: MEMBERS_KEY(variables.projectId) });
    },
  });
}

export function useRemoveMember() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ projectId, memberId }: { projectId: number; memberId: number }) => {
      await apiClient.delete(API_PATHS.MEMBER(projectId, memberId));
    },
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: MEMBERS_KEY(variables.projectId) });
    },
  });
}

export function useTransferOwnership() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({
      projectId,
      data,
    }: {
      projectId: number;
      data: TransferOwnershipRequest;
    }) => {
      const res = await apiClient.post(API_PATHS.TRANSFER_OWNERSHIP(projectId), data);
      return res.data;
    },
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: MEMBERS_KEY(variables.projectId) });
      queryClient.invalidateQueries({ queryKey: ['projects', variables.projectId] });
    },
  });
}

export interface MyProjectRole {
  myRole: MemberRole | null;
  isViewer: boolean;
  isEditorOrAbove: boolean;
  isAdminOrAbove: boolean;
  isOwner: boolean;
  isSiteAdmin: boolean;
  /** 사이트 관리자도 포함하여 편집 권한 보유 여부 */
  canEdit: boolean;
  canManageMembers: boolean;
  canDeleteProject: boolean;
  canCompleteProject: boolean;
}

export function useMyRole(projectId: number | undefined): MyProjectRole {
  const { data: members = [] } = useMembers(projectId);
  const user = useAuthStore((s) => s.user);

  const myMembership = members.find((m) => m.user === user?.id);
  const myRole = (myMembership?.role ?? null) as MemberRole | null;
  const isSiteAdmin = !!(user?.is_staff || user?.is_superuser);

  const isOwner = myRole === 'owner';
  const isAdminOrAbove = myRole === 'owner' || myRole === 'admin';
  const isEditorOrAbove = isAdminOrAbove || myRole === 'editor';
  const isViewer = myRole === 'viewer';

  return {
    myRole,
    isViewer,
    isEditorOrAbove,
    isAdminOrAbove,
    isOwner,
    isSiteAdmin,
    canEdit: isEditorOrAbove || isSiteAdmin,
    canManageMembers: isAdminOrAbove || isSiteAdmin,
    canDeleteProject: isOwner || isSiteAdmin,
    canCompleteProject: isAdminOrAbove || isSiteAdmin,
  };
}

export function useSearchUsers(query: string) {
  return useQuery<UserSearchResult[]>({
    queryKey: ['user-search', query],
    queryFn: async () => {
      const res = await apiClient.get<UserSearchResult[]>(API_PATHS.AUTH.USER_SEARCH, {
        params: { q: query },
      });
      return res.data;
    },
    enabled: query.length >= 1,
  });
}
