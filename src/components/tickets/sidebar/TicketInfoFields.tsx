import { useState } from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import Icon from '@/components/ui/icon';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

interface User {
  id: number;
  name: string;
  email: string;
  role: string;
}

interface Status {
  id: number;
  name: string;
  color: string;
  is_closed: boolean;
  is_approval?: boolean;
}

interface Ticket {
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
  created_by: number;
  creator_name?: string;
  creator_email?: string;
  assigned_to?: number;
  assignee_name?: string;
  assignee_email?: string;
  due_date?: string;
  created_at?: string;
  updated_at?: string;
  closed_at?: string;
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

interface TicketInfoFieldsProps {
  ticket: Ticket;
  statuses: Status[];
  users: User[];
  updating: boolean;
  isCustomer?: boolean;
  onStatusChange: (statusId: string) => void;
  onAssignUser: (userId: string) => void;
  onUpdateDueDate?: (dueDate: string | null) => void;
}

const TicketInfoFields = ({
  ticket,
  statuses,
  users,
  updating,
  isCustomer = false,
  onStatusChange,
  onAssignUser,
  onUpdateDueDate,
}: TicketInfoFieldsProps) => {
  const [isEditingDueDate, setIsEditingDueDate] = useState(false);
  const [dueDateValue, setDueDateValue] = useState(ticket.due_date || '');
  const [dueTimeValue, setDueTimeValue] = useState(() => {
    if (ticket.due_date) {
      const date = new Date(ticket.due_date);
      return `${date.getHours().toString().padStart(2, '0')}:${date.getMinutes().toString().padStart(2, '0')}`;
    }
    return '12:00';
  });

  const getDeadlineInfo = (dueDate?: string) => {
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

  const deadlineInfo = getDeadlineInfo(ticket.due_date);

  return (
    <div className="rounded-lg bg-card border divide-y">
      {ticket.created_at && (
        <div className="p-4">
          <h3 className="text-xs font-semibold mb-3 text-foreground uppercase tracking-wide flex items-center gap-2">
            <Icon name="Calendar" size={14} />
            Создана
          </h3>
          <p className="text-sm text-muted-foreground">
            {new Date(ticket.created_at).toLocaleDateString('ru-RU', {
              day: 'numeric',
              month: 'long',
              hour: '2-digit',
              minute: '2-digit'
            })}
          </p>
        </div>
      )}

      <div className="p-4">
        <h3 className="text-xs font-semibold mb-3 text-foreground uppercase tracking-wide flex items-center gap-2">
          <Icon name="CheckCircle" size={14} />
          Статус
        </h3>
        <Select
          value={ticket.status_id?.toString()}
          onValueChange={onStatusChange}
          disabled={updating}
        >
          <SelectTrigger>
            <SelectValue placeholder="Выберите статус" />
          </SelectTrigger>
          <SelectContent>
            {statuses.map((status) => (
              <SelectItem key={status.id} value={status.id.toString()}>
                <div className="flex items-center gap-2">
                  <div
                    className="w-2 h-2 rounded-full"
                    style={{ backgroundColor: status.color }}
                  />
                  {status.name}
                </div>
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {ticket.creator_name && (
        <div className="p-4">
          <h3 className="text-xs font-semibold mb-3 text-foreground uppercase tracking-wide flex items-center gap-2">
            <Icon name="User" size={14} />
            Заказчик
          </h3>
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center flex-shrink-0">
              <Icon name="User" size={16} className="text-primary" />
            </div>
            <div className="min-w-0 flex-1">
              <p className="font-medium text-sm truncate">{ticket.creator_name}</p>
              {ticket.creator_email && (
                <p className="text-xs text-muted-foreground truncate">{ticket.creator_email}</p>
              )}
            </div>
          </div>
        </div>
      )}

      <div className="p-4">
        <h3 className="text-xs font-semibold mb-3 text-foreground uppercase tracking-wide flex items-center gap-2">
          <Icon name="UserCheck" size={14} />
          Исполнитель
        </h3>
        <Select
          value={ticket.assigned_to?.toString() || 'unassign'}
          onValueChange={onAssignUser}
          disabled={updating}
        >
          <SelectTrigger>
            <SelectValue placeholder="Выберите исполнителя" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="unassign">
              <div className="flex items-center gap-2 text-muted-foreground">
                <Icon name="UserX" size={14} />
                Не назначен
              </div>
            </SelectItem>
            {users.map((u) => (
              <SelectItem key={u.id} value={u.id.toString()}>
                <div className="flex flex-col">
                  <span className="text-sm">{u.name}</span>
                  <span className="text-xs text-muted-foreground">{u.email}</span>
                </div>
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {(ticket.due_date || isCustomer) && (
        <div className="p-4" style={deadlineInfo ? { 
          backgroundColor: `${deadlineInfo.color}08`
        } : {}}>
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-xs font-semibold text-foreground uppercase tracking-wide flex items-center gap-2">
              <Icon name="Calendar" size={14} />
              Дедлайн
            </h3>
            {isCustomer && onUpdateDueDate && (
              <button
                onClick={() => {
                  setIsEditingDueDate(!isEditingDueDate);
                  if (!isEditingDueDate) {
                    if (ticket.due_date) {
                      const date = new Date(ticket.due_date);
                      const year = date.getFullYear();
                      const month = (date.getMonth() + 1).toString().padStart(2, '0');
                      const day = date.getDate().toString().padStart(2, '0');
                      setDueDateValue(`${year}-${month}-${day}`);
                      setDueTimeValue(`${date.getHours().toString().padStart(2, '0')}:${date.getMinutes().toString().padStart(2, '0')}`);
                    } else {
                      setDueDateValue('');
                      setDueTimeValue('12:00');
                    }
                  }
                }}
                className="text-xs text-primary hover:underline flex items-center gap-1"
              >
                <Icon name={isEditingDueDate ? 'X' : 'Edit'} size={12} />
                {isEditingDueDate ? 'Отмена' : 'Изменить'}
              </button>
            )}
          </div>
          
          {isEditingDueDate ? (
            <div className="space-y-2">
              <div>
                <label className="text-xs text-muted-foreground mb-1 block">Дата</label>
                <input
                  type="date"
                  value={dueDateValue}
                  onChange={(e) => setDueDateValue(e.target.value)}
                  className="w-full px-3 py-2 text-sm border rounded-md bg-background text-foreground"
                />
              </div>
              <div>
                <label className="text-xs text-muted-foreground mb-1 block">Время (МСК)</label>
                <input
                  type="time"
                  value={dueTimeValue}
                  onChange={(e) => setDueTimeValue(e.target.value)}
                  className="w-full px-3 py-2 text-sm border rounded-md bg-background text-foreground"
                />
              </div>
              <div className="flex gap-2">
                <Button
                  size="sm"
                  onClick={() => {
                    if (dueDateValue) {
                      const combinedDateTime = `${dueDateValue}T${dueTimeValue}:00+03:00`;
                      onUpdateDueDate(combinedDateTime);
                    } else {
                      onUpdateDueDate(null);
                    }
                    setIsEditingDueDate(false);
                  }}
                  className="flex-1"
                >
                  Сохранить
                </Button>
                {ticket.due_date && (
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => {
                      onUpdateDueDate(null);
                      setDueDateValue('');
                      setDueTimeValue('12:00');
                      setIsEditingDueDate(false);
                    }}
                  >
                    <Icon name="Trash2" size={14} />
                  </Button>
                )}
              </div>
            </div>
          ) : ticket.due_date && deadlineInfo ? (
            <div className="flex items-start gap-2">
              <div className="w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0" style={{ 
                backgroundColor: `${deadlineInfo.color}20`
              }}>
                <Icon name={deadlineInfo.urgent ? 'AlertCircle' : 'Clock'} size={16} style={{ color: deadlineInfo.color }} />
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-semibold text-sm mb-0.5" style={{ color: deadlineInfo.color }}>
                  {deadlineInfo.label}
                </p>
                <p className="text-xs" style={{ color: deadlineInfo.color, opacity: 0.75 }}>
                  {new Date(ticket.due_date).toLocaleDateString('ru-RU', {
                    day: 'numeric',
                    month: 'long',
                    year: 'numeric'
                  })}
                  {' в '}
                  {new Date(ticket.due_date).toLocaleTimeString('ru-RU', {
                    hour: '2-digit',
                    minute: '2-digit',
                    timeZone: 'Europe/Moscow'
                  })}
                  {' МСК'}
                </p>
              </div>
              {deadlineInfo.urgent && (
                <Badge 
                  variant="secondary"
                  className="flex-shrink-0"
                  style={{ 
                    backgroundColor: deadlineInfo.color,
                    color: 'white',
                    fontSize: '10px',
                    padding: '2px 6px'
                  }}
                >
                  Срочно
                </Badge>
              )}
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">Не установлен</p>
          )}
        </div>
      )}

      {ticket.ticket_service && (
        <div className="p-4">
          <h3 className="text-xs font-semibold mb-3 text-foreground uppercase tracking-wide flex items-center gap-2">
            <Icon name="Briefcase" size={14} />
            Услуга
          </h3>
          <div className="flex items-start gap-2 p-2 rounded-md bg-primary/10">
            <Icon name="Layers" size={14} className="text-primary mt-0.5 flex-shrink-0" />
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium">{ticket.ticket_service.name}</p>
            </div>
          </div>
        </div>
      )}

      {ticket.services && ticket.services.length > 0 && (
        <div className="p-4">
          <h3 className="text-xs font-semibold mb-3 text-foreground uppercase tracking-wide flex items-center gap-2">
            <Icon name="Package" size={14} />
            Сервисы
          </h3>
          <div className="space-y-2">
            {ticket.services.map((service) => (
              <div key={service.id} className="flex items-start gap-2 p-2 rounded-md bg-primary/10">
                <Icon name="CheckCircle2" size={14} className="text-primary mt-0.5 flex-shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium">{service.name}</p>
                  {service.category_name && (
                    <p className="text-xs text-muted-foreground">{service.category_name}</p>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {ticket.category_name && (
        <div className="p-4">
          <h3 className="text-xs font-semibold mb-3 text-foreground uppercase tracking-wide flex items-center gap-2">
            <Icon name="Tag" size={14} />
            Категория
          </h3>
          <div className="flex items-center gap-2">
            {ticket.category_icon && (
              <Icon name={ticket.category_icon} size={14} className="text-primary" />
            )}
            <p className="text-sm">{ticket.category_name}</p>
          </div>
        </div>
      )}

      {ticket.priority_name && (
        <div className="p-4">
          <h3 className="text-xs font-semibold mb-3 text-foreground uppercase tracking-wide flex items-center gap-2">
            <Icon name="Flag" size={14} />
            Приоритет
          </h3>
          <div className="flex items-center gap-2">
            <Badge
              style={{ 
                backgroundColor: `${ticket.priority_color}20`,
                color: ticket.priority_color,
                borderColor: ticket.priority_color
              }}
              className="border"
            >
              {ticket.priority_name}
            </Badge>
          </div>
        </div>
      )}

      {ticket.department_name && (
        <div className="p-4">
          <h3 className="text-xs font-semibold mb-3 text-foreground uppercase tracking-wide flex items-center gap-2">
            <Icon name="Building2" size={14} />
            Департамент
          </h3>
          <p className="text-sm">{ticket.department_name}</p>
        </div>
      )}
    </div>
  );
};

export default TicketInfoFields;
