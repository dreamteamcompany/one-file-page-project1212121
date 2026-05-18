import { getMskTimestamp } from '@/utils/dateFormat';

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

  const now = Date.now();
  const due = getMskTimestamp(dueDate);
  if (!due) return null;
  const timeLeft = due - now;

  if (timeLeft < 0) {
    return { percent: 0, color: '#ef4444', label: 'Просрочена' };
  }

  const oneDay = 24 * 60 * 60 * 1000;
  const oneHour = 60 * 60 * 1000;
  const threeHours = 3 * oneHour;
  const twoDays = 2 * oneDay;
  const daysLeft = Math.floor(timeLeft / oneDay);
  const hoursLeft = Math.floor((timeLeft % oneDay) / oneHour);

  if (timeLeft < threeHours) {
    return { percent: 100, color: '#ef4444', label: `Менее 3 часов (${hoursLeft} ч)` };
  }
  if (timeLeft < twoDays) {
    if (daysLeft === 0) {
      return { percent: 100, color: '#f97316', label: `Менее суток (${hoursLeft} ч)` };
    }
    return { percent: 80, color: '#f97316', label: `Остался ${daysLeft} день ${hoursLeft} ч` };
  }
  const dayWord = daysLeft >= 2 && daysLeft <= 4 ? 'дня' : 'дней';
  return { percent: 30, color: '#22c55e', label: `Осталось ${daysLeft} ${dayWord} ${hoursLeft} ч` };
};