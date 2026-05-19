export interface Company {
  id: number;
  name: string;
  members_count: number;
  root_departments_count: number;
}

export interface Department {
  id: number;
  name: string;
  parent_id: number | null;
  head_user_id: number | null;
  company_id: number | null;
  is_active: boolean;
  head_id: number | null;
  head_name: string | null;
  head_position: string | null;
  head_photo: string | null;
  members_count: number;
  children_count: number;
}

export interface DepartmentNode extends Department {
  children: DepartmentNode[];
}

export interface CompanyNode {
  kind: 'company';
  id: number | null;
  name: string;
  members_count: number;
  children: DepartmentNode[];
}

export interface DepartmentUser {
  id: number;
  full_name: string;
  username?: string;
  email?: string;
  position: string | null;
  photo_url: string | null;
  department_id?: number | null;
  department_name?: string | null;
  is_active?: boolean;
}

export interface OrgChartTreeData {
  companies: Company[];
  departments: Department[];
}
