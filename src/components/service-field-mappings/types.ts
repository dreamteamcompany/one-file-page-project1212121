export interface ServiceCategory {
  id: number;
  name: string;
  icon?: string;
}

export interface Service {
  id: number;
  name: string;
  description?: string;
  intermediate_approver_id?: number;
  final_approver_id?: number;
}

export interface FieldGroup {
  id: number;
  name: string;
  description?: string;
  field_ids?: number[]; // Legacy support
  fields?: Array<{
    id: number;
    name: string;
    field_type: string;
    is_required: boolean;
  }>;
}

export interface ServiceFieldMapping {
  id: number;
  service_category_id: number; // Actually ticket_service_id (from ticket_services table)
  service_id: number; // From services table (approval workflows)
  field_group_ids: number[]; // Multiple groups per mapping (frontend usage)
  field_group_id?: number; // Single group per mapping (backend response)
  ticket_service_id?: number; // Backend response
  ticket_service_name?: string;
  service_name?: string;
  field_group_name?: string;
  created_at?: string;
  updated_at?: string;
}