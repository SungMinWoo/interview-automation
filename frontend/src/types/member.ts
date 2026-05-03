export type MemberRole = 'owner' | 'admin' | 'editor' | 'viewer';

export interface ProjectMember {
  id: number;
  user: number;
  user_email: string;
  user_name: string;
  role: MemberRole;
  created_at: string;
  updated_at: string;
}

export interface AddMemberRequest {
  email: string;
  role: MemberRole;
}

export interface UpdateMemberRoleRequest {
  role: MemberRole;
}

export interface TransferOwnershipRequest {
  new_owner_id: number;
}
