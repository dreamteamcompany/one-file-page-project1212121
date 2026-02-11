export interface Company {
  id: number;
  name: string;
  inn?: string;
  kpp?: string;
  legal_address?: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface Department {
  id: number;
  company_id: number;
  parent_id?: number;
  name: string;
  code?: string;
  description?: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
  children?: Department[];
  company?: Company;
  parent?: Department;
}

export interface Position {
  id: number;
  name: string;
  description?: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface DepartmentPosition {
  id: number;
  department_id: number;
  position_id: number;
  created_at: string;
  department?: Department;
  position?: Position;
}

export interface DepartmentWithPositions extends Department {
  positions?: Position[];
}
