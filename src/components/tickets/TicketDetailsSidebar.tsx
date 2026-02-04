import { useState, useEffect } from 'react';
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
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { Checkbox } from '@/components/ui/checkbox';
import TicketApprovalBlock from './TicketApprovalBlock';

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
}

interface TicketDetailsSidebarProps {
  ticket: Ticket;
  statuses: Status[];
  users: User[];
  updating: boolean;
  sendingPing?: boolean;
  isCustomer?: boolean;
  hasAssignee?: boolean;
  onUpdateStatus: (statusId: string) => void;
  onAssignUser: (userId: string) => void;
  onSendPing?: () => void;
  onApprovalChange?: () => void;
  onUpdateDueDate?: (dueDate: string | null) => void;
}

const TicketDetailsSidebar = ({
  ticket,
  statuses,
  users,
  updating,
  sendingPing = false,
  isCustomer = false,
  hasAssignee = false,
  onUpdateStatus,
  onAssignUser,
  onSendPing,
  onApprovalChange,
  onUpdateDueDate,
}: TicketDetailsSidebarProps) => {
  const [isEditingDueDate, setIsEditingDueDate] = useState(false);
  const [dueDateValue, setDueDateValue] = useState(ticket.due_date || '');
  const [dueTimeValue, setDueTimeValue] = useState(() => {
    if (ticket.due_date) {
      const date = new Date(ticket.due_date);
      return `${date.getHours().toString().padStart(2, '0')}:${date.getMinutes().toString().padStart(2, '0')}`;
    }
    return '12:00';
  });
  const [currentTime, setCurrentTime] = useState(Date.now());
  const [showApprovalDialog, setShowApprovalDialog] = useState(false);
  const [pendingStatusId, setPendingStatusId] = useState<string | null>(null);
  const [selectedApprovers, setSelectedApprovers] = useState<number[]>([]);
  
  const handleStatusChange = (statusId: string) => {
    const status = statuses.find(s => s.id.toString() === statusId);
    if (status?.is_approval) {
      setPendingStatusId(statusId);
      setShowApprovalDialog(true);
    } else {
      onUpdateStatus(statusId);
    }
  };
  
  const handleApprovalConfirm = async () => {
    if (!pendingStatusId) return;
    
    try {
      const token = localStorage.getItem('auth_token') || sessionStorage.getItem('auth_token');
      
      // Сначала меняем статус
      await onUpdateStatus(pendingStatusId);
      
      // Затем добавляем согласующих
      if (selectedApprovers.length > 0) {
        const { apiFetch, API_URL } = await import('@/utils/api');
        await apiFetch(`${API_URL}?endpoint=ticket-approvals`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'X-Auth-Token': token || '',
          },
          body: JSON.stringify({
            ticket_id: ticket.id,
            approver_ids: selectedApprovers,
          }),
        });
      }
      
      setShowApprovalDialog(false);
      setPendingStatusId(null);
      setSelectedApprovers([]);
    } catch (error) {
      console.error('Error confirming approval:', error);
    }
  };
  
  const toggleApprover = (userId: number) => {
    setSelectedApprovers(prev => 
      prev.includes(userId) 
        ? prev.filter(id => id !== userId)
        : [...prev, userId]
    );
  };
  
  useEffect(() => {
    if (!ticket.due_date) return;
    
    const interval = setInterval(() => {
      setCurrentTime(Date.now());
    }, 1000);
    
    return () => clearInterval(interval);
  }, [ticket.due_date]);
  const getDeadlineInfo = (dueDate?: string) => {
    if (!dueDate) return null;
    
    const now = new Date().getTime();
    const due = new Date(dueDate).getTime();
    const timeLeft = due - now;
    
    if (timeLeft < 0) {
      return { color: '#ef4444', label: 'Просрочена', urgent: true };
    }
    
    const oneDay = 24 * 60 * 60 * 1000;
    const daysLeft = Math.ceil(timeLeft / oneDay);
    
    if (daysLeft <= 1) {
      return { color: '#ef4444', label: `Остался ${daysLeft} день`, urgent: true };
    } else if (daysLeft <= 3) {
      return { color: '#f97316', label: `Осталось ${daysLeft} дня`, urgent: true };
    } else if (daysLeft <= 7) {
      return { color: '#eab308', label: `Осталось ${daysLeft} дней`, urgent: false };
    } else {
      return { color: '#22c55e', label: `Осталось ${daysLeft} дней`, urgent: false };
    }
  };

  const deadlineInfo = getDeadlineInfo(ticket.due_date);

  const getTimeLeft = () => {
    if (!ticket.due_date) return null;
    
    const due = new Date(ticket.due_date).getTime();
    const diff = due - currentTime;
    
    if (diff < 0) {
      return { time: '00:00:00', expired: true };
    }
    
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));
    const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
    const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
    const seconds = Math.floor((diff % (1000 * 60)) / 1000);
    
    return { 
      days,
      time: `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`, 
      expired: false 
    };
  };

  return (
    <div className="w-full lg:w-[400px] space-y-3 flex-shrink-0">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-1 gap-3">
      {ticket.due_date && (
        <div className="p-4 rounded-lg bg-card border">
          <h3 className="text-sm font-semibold mb-3 text-foreground flex items-center gap-2">
            <Icon name="Clock" size={16} className={getTimeLeft()?.expired ? 'text-red-500' : 'text-foreground'} />
            Времени осталось
          </h3>
          {getTimeLeft()?.expired ? (
            <div className="text-center py-2">
              <div className="text-2xl font-bold text-red-500">Просрочено</div>
            </div>
          ) : (
            <div className="text-center py-2">
              {getTimeLeft() && getTimeLeft()!.days > 0 && (
                <div className="text-sm text-muted-foreground mb-1">
                  {getTimeLeft()!.days} {getTimeLeft()!.days === 1 ? 'день' : getTimeLeft()!.days < 5 ? 'дня' : 'дней'}
                </div>
              )}
              <div className="text-3xl font-bold text-foreground tabular-nums">
                {getTimeLeft()?.time}
              </div>
              <div className="text-xs text-muted-foreground mt-1">ЧЧ : ММ : СС</div>
            </div>
          )}
        </div>
      )}

      {onSendPing && (
        <div className="p-4 rounded-lg bg-card border flex flex-col justify-center md:h-[380px] lg:h-auto">
          <Button
            onClick={onSendPing}
            disabled={sendingPing}
            size="lg"
            className="w-full font-semibold bg-orange-500 hover:bg-orange-600 text-white flex-shrink-0"
          >
            {sendingPing ? (
              <>
                <Icon name="Loader2" size={18} className="mr-2 animate-spin" />
                Отправка запроса...
              </>
            ) : (
              <>
                <Icon name="Bell" size={18} className="mr-2" />
                Запросить статус
              </>
            )}
          </Button>
          <p className="text-xs text-orange-700 dark:text-orange-400 mt-2 text-center">
            Уведомить исполнителя о необходимости обновить статус
          </p>
        </div>
      )}
      </div>
      
      <div className="rounded-lg bg-card border divide-y">
        {/* Статус */}
        <div className="p-4">
          <h3 className="text-xs font-semibold mb-3 text-foreground uppercase tracking-wide flex items-center gap-2">
            <Icon name="CheckCircle" size={14} />
            Статус
          </h3>
          <Select
            value={ticket.status_id?.toString()}
            onValueChange={handleStatusChange}
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

        {/* Заказчик */}
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

        {/* Исполнитель */}
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

        {/* Дедлайн */}
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

        {/* Услуга */}
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

        {/* Сервисы */}
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

        {/* Категория */}
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

        {/* Приоритет */}
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

        {/* Департамент */}
        {ticket.department_name && (
          <div className="p-4">
            <h3 className="text-xs font-semibold mb-3 text-foreground uppercase tracking-wide flex items-center gap-2">
              <Icon name="Building2" size={14} />
              Департамент
            </h3>
            <p className="text-sm">{ticket.department_name}</p>
          </div>
        )}

        {/* Создана */}
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
      </div>

      <TicketApprovalBlock
        ticketId={ticket.id}
        statusName={ticket.status_name || ''}
        onStatusChange={onApprovalChange || (() => {})}
        availableUsers={users}
      />
      
      <Dialog open={showApprovalDialog} onOpenChange={setShowApprovalDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Выберите согласующих</DialogTitle>
            <DialogDescription>
              Данный статус требует согласования. Выберите пользователей, которые должны согласовать заявку.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <div className="space-y-2 max-h-64 overflow-y-auto">
              {users.map((u) => (
                <label
                  key={u.id}
                  className="flex items-center gap-2 p-2 hover:bg-muted rounded cursor-pointer"
                >
                  <Checkbox
                    checked={selectedApprovers.includes(u.id)}
                    onCheckedChange={() => toggleApprover(u.id)}
                  />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{u.name}</p>
                    <p className="text-xs text-muted-foreground truncate">{u.email}</p>
                  </div>
                </label>
              ))}
            </div>
            <div className="flex gap-2 pt-2">
              <Button
                onClick={handleApprovalConfirm}
                disabled={selectedApprovers.length === 0}
                className="flex-1"
              >
                Подтвердить ({selectedApprovers.length})
              </Button>
              <Button
                onClick={() => {
                  setShowApprovalDialog(false);
                  setPendingStatusId(null);
                  setSelectedApprovers([]);
                }}
                variant="outline"
              >
                Отмена
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default TicketDetailsSidebar;