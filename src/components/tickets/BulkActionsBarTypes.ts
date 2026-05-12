export interface Status {
  id: number;
  name: string;
  color: string;
}

export interface Priority {
  id: number;
  name: string;
  color: string;
}

export interface SimpleUser {
  id: number;
  full_name?: string;
  username?: string;
  name?: string;
}

export interface SimpleGroup {
  id: number;
  name: string;
}

export interface BulkActionsBarProps {
  selectedCount: number;
  statuses: Status[];
  priorities: Priority[];
  users?: SimpleUser[];
  executorGroups?: SimpleGroup[];
  isAdmin?: boolean;
  onChangeStatus: (statusId: number) => Promise<void>;
  onChangePriority: (priorityId: number) => Promise<void>;
  onChangeExecutor?: (userId: number | null) => Promise<void>;
  onChangeExecutorGroup?: (groupId: number | null) => Promise<void>;
  onAddWatchers?: (userIds: number[]) => Promise<void>;
  onDelete: () => Promise<void>;
  onCancel: () => void;
}

export function userLabel(u: SimpleUser): string {
  return u.full_name || u.name || u.username || `#${u.id}`;
}

export function ticketCountWord(count: number): string {
  if (count === 1) return 'заявки';
  if (count < 5) return 'заявок';
  return 'заявок';
}
