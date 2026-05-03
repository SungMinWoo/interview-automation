export type NotificationEventType =
  | 'status_changed'
  | 'member_added'
  | 'member_removed'
  | 'member_role_changed'
  | 'analysis_completed'
  | 'analysis_confirmed'
  | 'questionnaire_ready'
  | 'questionnaire_confirmed'
  | 'invitations_sent'
  | 'collection_closed'
  | 'aggregation_completed'
  | 'brief_ready'
  | 'ownership_transferred';

export interface Notification {
  id: number;
  project: number | null;
  event_type: NotificationEventType;
  title: string;
  message: string;
  detail: Record<string, unknown>;
  actor_id: number | null;
  actor_name: string;
  is_read: boolean;
  read_at: string | null;
  created_at: string;
}

export interface UnreadCountResponse {
  count: number;
}

export interface MarkAllReadResponse {
  updated: number;
}
