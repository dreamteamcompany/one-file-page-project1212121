export interface CustomField {
  id: number;
  name: string;
  field_type: string;
  value: string;
}

export interface TicketService {
  id: number;
  name: string;
}

export interface Service {
  id: number;
  name: string;
  category_name?: string;
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
  department_name?: string;
  service_name?: string;
  due_date?: string;
  created_at?: string;
  custom_fields?: CustomField[];
  customer_name?: string;
  creator_name?: string;
  creator_photo_url?: string;
  assigned_to_name?: string;
  assignee_name?: string;
  assignee_photo_url?: string;
  assigned_to?: number;
  created_by?: number;
  unread_comments?: number;
  unread_count?: number;
  unread_mentions?: number;
  has_new?: boolean;
  client_replied?: boolean;
  client_replied_at?: string;
  ticket_service?: TicketService;
  services?: Service[];
}

export interface TicketsListProps {
  tickets: Ticket[];
  loading: boolean;
  onTicketClick: (ticket: Ticket) => void;
  selectedTicketIds?: number[];
  onToggleTicket?: (ticketId: number) => void;
  onToggleAll?: (ticketIds: number[], allSelected: boolean) => void;
  bulkMode?: boolean;
  currentUserId?: number;
  page?: number;
  totalPages?: number;
  totalTickets?: number;
  onPageChange?: (page: number) => void;
}

export interface DeadlineProgress {
  percent: number;
  color: string;
  label: string;
}

export const getDeadlineProgress = (dueDate?: string): DeadlineProgress | null => {
  if (!dueDate) return null;

  const now = new Date().getTime();
  const due = new Date(dueDate).getTime();
  const timeLeft = due - now;

  if (timeLeft < 0) {
    return { percent: 0, color: '#ef4444', label: 'Просрочена' };
  }

  const oneDay = 24 * 60 * 60 * 1000;
  const oneHour = 60 * 60 * 1000;
  const daysLeft = Math.floor(timeLeft / oneDay);
  const hoursLeft = Math.floor((timeLeft % oneDay) / oneHour);

  if (daysLeft === 0) {
    return { percent: 100, color: '#ef4444', label: `Менее суток (${hoursLeft} ч)` };
  } else if (daysLeft === 1) {
    return { percent: 100, color: '#ef4444', label: `Остался ${daysLeft} день ${hoursLeft} ч` };
  } else if (daysLeft <= 3) {
    return { percent: 66, color: '#f97316', label: `Осталось ${daysLeft} дня ${hoursLeft} ч` };
  } else if (daysLeft <= 7) {
    return { percent: 33, color: '#eab308', label: `Осталось ${daysLeft} дней ${hoursLeft} ч` };
  } else {
    return { percent: 15, color: '#22c55e', label: `Осталось ${daysLeft} дней ${hoursLeft} ч` };
  }
};
