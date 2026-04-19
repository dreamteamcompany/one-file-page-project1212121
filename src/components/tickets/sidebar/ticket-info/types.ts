export interface User {
  id: number;
  name: string;
  email: string;
  role: string;
  photo_url?: string;
}

export interface ExecutorGroup {
  id: number;
  name: string;
}

export interface Status {
  id: number;
  name: string;
  color: string;
  is_closed: boolean;
  is_approval?: boolean;
  is_waiting_response?: boolean;
  order?: number;
}

export interface Ticket {
  id: number;
  title: string;
  description?: string;
  category_name?: string;
  category_icon?: string;
  priority_id?: number;
  priority_name?: string;
  priority_color?: string;
  status_id?: number;
  status_name?: string;
  status_color?: string;
  previous_status_id?: number | null;
  department_name?: string;
  created_by: number;
  creator_name?: string;
  creator_email?: string;
  assigned_to?: number;
  assignee_name?: string;
  assignee_email?: string;
  assignee_photo_url?: string;
  due_date?: string;
  response_due_date?: string;
  created_at?: string;
  updated_at?: string;
  closed_at?: string;
  executor_group_id?: number;
  executor_group_name?: string;
  ticket_service?: {
    id: number;
    name: string;
  };
  services?: Array<{
    id: number;
    name: string;
    category_name?: string;
  }>;
}

export interface DeadlineInfo {
  color: string;
  label: string;
  urgent: boolean;
}

export const getDeadlineInfo = (dueDate?: string): DeadlineInfo | null => {
  if (!dueDate) return null;
  
  const now = new Date().getTime();
  const due = new Date(dueDate).getTime();
  const timeLeft = due - now;
  
  if (timeLeft < 0) {
    return { color: '#ef4444', label: 'Просрочена', urgent: true };
  }
  
  const oneDay = 24 * 60 * 60 * 1000;
  const oneHour = 60 * 60 * 1000;
  const daysLeft = Math.floor(timeLeft / oneDay);
  const hoursLeft = Math.floor((timeLeft % oneDay) / oneHour);
  
  if (daysLeft === 0) {
    return { color: '#ef4444', label: `Менее суток (${hoursLeft} ч)`, urgent: true };
  } else if (daysLeft === 1) {
    return { color: '#ef4444', label: `Остался ${daysLeft} день ${hoursLeft} ч`, urgent: true };
  } else if (daysLeft <= 3) {
    return { color: '#f97316', label: `Осталось ${daysLeft} дня ${hoursLeft} ч`, urgent: true };
  } else if (daysLeft <= 7) {
    return { color: '#eab308', label: `Осталось ${daysLeft} дней ${hoursLeft} ч`, urgent: false };
  } else {
    return { color: '#22c55e', label: `Осталось ${daysLeft} дней ${hoursLeft} ч`, urgent: false };
  }
};