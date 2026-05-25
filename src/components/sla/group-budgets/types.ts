export interface ExecutorGroup {
  id: number;
  name: string;
}

export interface PriorityRef {
  id: number;
  name: string;
  level?: number;
  color?: string;
}

export interface PriorityTimeRef {
  priority_id: number;
  response_time_minutes?: number | null;
  resolution_time_minutes?: number | null;
}

export interface GroupBudgetItem {
  executor_group_id: number;
  resolution_minutes: number | null;
  response_minutes: number | null;
  sort_order: number;
  priority_id?: number | null;
}

export const SEGMENT_COLORS = [
  '#8b5cf6',
  '#3b82f6',
  '#10b981',
  '#f59e0b',
  '#ef4444',
  '#ec4899',
  '#14b8a6',
  '#6366f1',
];

export const formatMinutes = (m: number) => {
  const abs = Math.abs(m);
  const h = Math.floor(abs / 60);
  const min = abs % 60;
  if (h === 0) return `${min} мин`;
  if (min === 0) return `${h} ч`;
  return `${h} ч ${min} мин`;
};
