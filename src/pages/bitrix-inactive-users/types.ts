export interface InactiveUser {
  id: string;
  name: string;
  email: string;
  department: number[];
  position: string;
  last_login: string | null;
  days_inactive: number | null;
  is_excluded?: boolean;
}

export interface ApiResponse {
  total_active_users: number;
  inactive_count: number;
  days_threshold: number;
  users: InactiveUser[];
  exceptions_count?: number;
}

export interface ExceptionItem {
  id: number;
  bitrix_user_id: string;
  full_name: string;
  email: string;
  position: string;
  reason: string;
  added_by_user_id: number | null;
  added_by_name: string;
  added_at: string | null;
}

export interface BitrixSearchUser {
  id: string;
  name: string;
  email: string;
  position: string;
  already_excluded: boolean;
}

export interface ReportListItem {
  id: number;
  started_by_name: string;
  started_at: string | null;
  mode: string;
  days_threshold: number | null;
  total_requested: number;
  deactivated_count: number;
  errors_count: number;
  skipped_count: number;
}

export type DeactivateMode = 'all' | 'never_logged' | 'long_inactive';

export const MODE_LABELS: Record<DeactivateMode, string> = {
  all: 'Всех неактивных',
  never_logged: 'Кто никогда не заходил',
  long_inactive: 'Кто долго не заходил',
};
