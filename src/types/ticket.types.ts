export interface CustomField {
  id: number;
  name: string;
  field_type: string;
  value: string;
  options?: string;
  is_required?: boolean;
}

export interface Ticket {
  id: number;
  title: string;
  description?: string;
  category_id?: number;
  category_name?: string;
  category_icon?: string;
  priority_id?: number;
  priority_name?: string;
  priority_color?: string;
  status_id?: number;
  status_name?: string;
  status_color?: string;
  status_is_closed?: boolean;
  status_is_waiting_response?: boolean;
  status_is_pending_confirmation?: boolean;
  status_is_reopened?: boolean;
  department_id?: number;
  department_name?: string;
  service_id?: number;
  service_name?: string;
  created_by: number;
  creator_name?: string;
  creator_email?: string;
  creator_photo_url?: string;
  assigned_to?: number;
  assignee_name?: string;
  assignee_email?: string;
  assignee_photo_url?: string;
  due_date?: string;
  created_at?: string;
  updated_at?: string;
  closed_at?: string;
  custom_fields?: CustomField[];
  services?: TicketServiceInfo[];
  ticket_service?: {
    id: number;
    name: string;
  };
  executor_group_id?: number;
  executor_group_name?: string;
  unread_comments?: number;
  unread_count?: number;
  unread_mentions?: number;
  client_replied?: boolean;
  client_replied_at?: string;
  response_due_date?: string;
  confirmation_sent_at?: string;
  rating?: number;
  rejection_reason?: string;
  last_comment?: TicketLastComment | null;
}

export interface TicketLastComment {
  id: number;
  comment: string;
  created_at: string;
  is_internal?: boolean;
  author_name?: string;
  author_email?: string;
  author_photo_url?: string;
}

export interface TicketServiceInfo {
  id: number;
  name: string;
  category_name?: string;
}

export interface TicketComment {
  id: number;
  ticket_id: number;
  user_id: number;
  user_name?: string;
  user_full_name?: string;
  user_photo_url?: string;
  comment: string;
  is_internal: boolean;
  is_read?: boolean;
  created_at?: string;
  parent_comment_id?: number;
  mentioned_user_ids?: number[];
  read_by?: number[];
  attachments?: {
    id: number;
    filename: string;
    url: string;
    size: number;
  }[];
  reactions?: {
    emoji: string;
    count: number;
    users: number[];
  }[];
}

export interface TicketAuditLog {
  id: number;
  ticket_id: number;
  user_id?: number;
  user_name?: string;
  user_full_name?: string;
  field_name?: string;
  old_value?: string;
  new_value?: string;
  created_at: string;
}

export interface TicketFile {
  id: number;
  filename: string;
  url: string;
  size: number;
  uploaded_by?: string;
  uploaded_at?: string;
}

export interface TicketStatus {
  id: number;
  name: string;
  color: string;
  order?: number;
  is_closed?: boolean;
  is_pending_confirmation?: boolean;
  is_reopened?: boolean;
  is_in_progress?: boolean;
  is_approved?: boolean;
  is_paused?: boolean;
  is_waiting_response?: boolean;
}

export interface TicketPriority {
  id: number;
  name: string;
  level: number;
  color: string;
  description?: string;
  is_critical?: boolean;
}

export interface TicketCategory {
  id: number;
  name: string;
  description?: string;
  icon: string;
}

export interface TicketDepartment {
  id: number;
  name: string;
  description?: string;
}

export interface TicketService {
  id: number;
  name: string;
  description: string;
  category_id?: number;
  category_name?: string;
  service_ids?: number[];
}