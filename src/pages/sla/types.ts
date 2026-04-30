export interface PriorityTime {
  priority_id: number;
  response_time_minutes: number;
  response_notification_minutes: number;
  resolution_time_minutes: number;
  resolution_notification_minutes: number;
  priority_name?: string;
  priority_level?: number;
  priority_color?: string;
}

export interface SLAItem {
  id: number;
  name: string;
  response_time_minutes: number;
  response_notification_minutes: number;
  no_response_minutes?: number;
  no_response_status_id?: number;
  resolution_time_minutes: number;
  resolution_notification_minutes: number;
  use_work_schedule: boolean;
  priority_times?: PriorityTime[];
  created_at?: string;
  updated_at?: string;
}

export interface TicketStatus {
  id: number;
  name: string;
  color: string;
}

export interface TicketPriority {
  id: number;
  name: string;
  level: number;
  color: string;
}

export const formatTime = (minutes: number) => {
  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;
  if (hours === 0) return `${mins} мин`;
  if (mins === 0) return `${hours} ч`;
  return `${hours} ч ${mins} мин`;
};

export const DEFAULT_FORM = {
  name: '',
  response_time_minutes: 240,
  response_notification_minutes: 180,
  no_response_minutes: 1440,
  no_response_status_id: undefined as number | undefined,
  resolution_time_minutes: 1440,
  resolution_notification_minutes: 1200,
  use_work_schedule: false,
};

export type SLAFormData = typeof DEFAULT_FORM;
