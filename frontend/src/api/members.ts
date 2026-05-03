import apiClient from './client';
import { API_PATHS } from '@/utils/constants';
import type { ProjectMember, AddMemberRequest, UpdateMemberRoleRequest, TransferOwnershipRequest } from '@/types/member';

export const getMembers = async (projectId: number): Promise<ProjectMember[]> => {
  const res = await apiClient.get<ProjectMember[]>(API_PATHS.MEMBERS(projectId));
  return res.data;
};

export const addMember = async (projectId: number, data: AddMemberRequest): Promise<ProjectMember> => {
  const res = await apiClient.post<ProjectMember>(API_PATHS.MEMBERS(projectId), data);
  return res.data;
};

export const updateMemberRole = async (
  projectId: number,
  memberId: number,
  data: UpdateMemberRoleRequest,
): Promise<ProjectMember> => {
  const res = await apiClient.patch<ProjectMember>(API_PATHS.MEMBER(projectId, memberId), data);
  return res.data;
};

export const removeMember = async (projectId: number, memberId: number): Promise<void> => {
  await apiClient.delete(API_PATHS.MEMBER(projectId, memberId));
};

export const transferOwnership = async (
  projectId: number,
  data: TransferOwnershipRequest,
): Promise<{ detail: string }> => {
  const res = await apiClient.post(API_PATHS.TRANSFER_OWNERSHIP(projectId), data);
  return res.data;
};
