export interface RefItem {
  id: number;
  name: string;
  email?: string;
}

export interface Reference {
  categories: RefItem[];
  departments: RefItem[];
  priorities: RefItem[];
  executor_groups: RefItem[];
  users: RefItem[];
  roles: RefItem[];
}

export interface RuleTarget {
  id?: number;
  rule_id?: number;
  target_type: 'user' | 'group' | 'role';
  target_id: number;
  target_name?: string;
}

export interface WatcherRule {
  id: number;
  name: string;
  description: string | null;
  is_active: boolean;
  trigger_on_create: boolean;
  trigger_on_update: boolean;
  trigger_on_executor_change: boolean;
  category_id: number | null;
  category_name?: string | null;
  department_id: number | null;
  department_name?: string | null;
  priority_id: number | null;
  priority_name?: string | null;
  executor_group_id: number | null;
  executor_group_name?: string | null;
  assignee_id: number | null;
  assignee_name?: string | null;
  match_mode: 'AND' | 'OR';
  targets: RuleTarget[];
}

export type FormState = {
  name: string;
  description: string;
  is_active: boolean;
  trigger_on_create: boolean;
  trigger_on_update: boolean;
  trigger_on_executor_change: boolean;
  category_id: string;
  department_id: string;
  priority_id: string;
  executor_group_id: string;
  assignee_id: string;
  match_mode: 'AND' | 'OR';
  targets: RuleTarget[];
};

export const EMPTY_FORM: FormState = {
  name: '',
  description: '',
  is_active: true,
  trigger_on_create: true,
  trigger_on_update: false,
  trigger_on_executor_change: false,
  category_id: '',
  department_id: '',
  priority_id: '',
  executor_group_id: '',
  assignee_id: '',
  match_mode: 'AND',
  targets: [],
};

export const TARGET_TYPE_LABEL: Record<RuleTarget['target_type'], string> = {
  user: 'Пользователь',
  group: 'Группа',
  role: 'Роль',
};

export const TARGET_TYPE_ICON: Record<RuleTarget['target_type'], string> = {
  user: 'User',
  group: 'Users',
  role: 'Shield',
};