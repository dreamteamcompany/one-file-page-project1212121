import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import Icon from '@/components/ui/icon';
import { useAuth } from '@/contexts/AuthContext';
import { displayFromStorage as phoneDisplay } from '@/components/ui/phone-masked-input';

interface CustomField {
  id: number;
  name: string;
  field_type: string;
  value: string;
}

interface TicketService {
  id: number;
  name: string;
}

interface Service {
  id: number;
  name: string;
  category_name?: string;
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
  service_name?: string;
  due_date?: string;
  created_at?: string;
  custom_fields?: CustomField[];
  customer_name?: string;
  creator_name?: string;
  assigned_to_name?: string;
  assignee_name?: string;
  assigned_to?: number;
  created_by?: number;
  unread_comments?: number;
  ticket_service?: TicketService;
  services?: Service[];
}

interface TicketsListProps {
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

const TicketsList = ({ 
  tickets, 
  loading, 
  onTicketClick,
  selectedTicketIds = [],
  onToggleTicket,
  onToggleAll,
  bulkMode = false,
  currentUserId,
  page = 1,
  totalPages = 1,
  totalTickets = 0,
  onPageChange,
}: TicketsListProps) => {
  const { hasSystemRole } = useAuth();
  const canCallPhone = hasSystemRole('admin', 'executor');

  const getPhoneFromTicket = (ticket: Ticket): string | null => {
    const phoneField = ticket.custom_fields?.find(f => f.field_type === 'phone' && f.value);
    return phoneField ? phoneField.value.replace(/\D/g, '') : null;
  };

  const getDeadlineProgress = (dueDate?: string) => {
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

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="flex flex-col items-center gap-3">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
          <p className="text-muted-foreground">Загрузка заявок...</p>
        </div>
      </div>
    );
  }

  if (tickets.length === 0) {
    return (
      <Card className="p-12 text-center">
        <div className="flex flex-col items-center gap-4">
          <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center">
            <Icon name="Ticket" size={32} className="text-muted-foreground" />
          </div>
          <div>
            <h3 className="font-semibold text-lg mb-2">Нет заявок</h3>
            <p className="text-muted-foreground">
              Создайте первую заявку, нажав кнопку выше
            </p>
          </div>
        </div>
      </Card>
    );
  }

  const sortedTickets = [...tickets].sort((a, b) => {
    const aIsCritical = a.priority_name?.toLowerCase().includes('критич');
    const bIsCritical = b.priority_name?.toLowerCase().includes('критич');
    
    if (aIsCritical && !bIsCritical) return -1;
    if (!aIsCritical && bIsCritical) return 1;
    
    return new Date(b.created_at || '').getTime() - new Date(a.created_at || '').getTime();
  });

  const allSelected = bulkMode && sortedTickets.length > 0 && sortedTickets.every(t => selectedTicketIds.includes(t.id));

  return (
    <div className="space-y-4">
      {bulkMode && sortedTickets.length > 0 && (
        <Card className="p-3 bg-muted/50">
          <div className="flex items-center gap-3">
            <Checkbox
              checked={allSelected}
              onCheckedChange={() => onToggleAll?.(sortedTickets.map(t => t.id), allSelected)}
            />
            <span className="text-sm font-medium">
              Выбрать все ({sortedTickets.length})
            </span>
          </div>
        </Card>
      )}
      
      <div className="grid gap-4">
        {sortedTickets.map((ticket) => {
        const isCritical = ticket.priority_name?.toLowerCase().includes('критич');

        return (
        <Card
          key={ticket.id}
          className={`p-4 hover:shadow-lg transition-all cursor-pointer hover:border-primary/50 relative w-full overflow-hidden ${
            isCritical ? 'border-red-500 border-2' : ''
          } ${
            selectedTicketIds.includes(ticket.id) ? 'ring-2 ring-primary' : ''
          }`}
          style={isCritical ? {
            boxShadow: '0 0 20px rgba(239, 68, 68, 0.4), 0 0 40px rgba(239, 68, 68, 0.2)',
            animation: 'pulse-glow 2s ease-in-out infinite'
          } : {}}
          onClick={(e) => {
            if (bulkMode && onToggleTicket) {
              e.stopPropagation();
              onToggleTicket(ticket.id);
            } else {
              onTicketClick(ticket);
            }
          }}
        >
          <div className="space-y-2">
            <div className="flex items-start justify-between gap-3">
              <div className="flex items-start gap-2 sm:gap-3 flex-1 min-w-0">
                {bulkMode && onToggleTicket && (
                  <Checkbox
                    checked={selectedTicketIds.includes(ticket.id)}
                    onCheckedChange={(e) => {
                      if (e) onToggleTicket(ticket.id);
                    }}
                    onClick={(e) => e.stopPropagation()}
                    className="mt-1"
                  />
                )}
                <div className="flex items-center gap-2 flex-shrink-0">
                  {(ticket.status_name === 'На согласовании' || ticket.status_name === 'Одобрена' || ticket.status_name === 'Отклонена') && (
                    <div className={`w-2 h-2 rounded-full flex-shrink-0 ${
                      ticket.status_name === 'На согласовании' ? 'bg-green-500' :
                      ticket.status_name === 'Отклонена' ? 'bg-red-500' :
                      'bg-blue-500'
                    } animate-pulse`} />
                  )}
                  {ticket.category_icon && (
                    <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
                      <Icon name={ticket.category_icon} size={16} className="text-primary sm:w-5 sm:h-5" />
                    </div>
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1 flex-wrap">
                    <span className="text-xs font-mono text-muted-foreground bg-muted px-2 py-0.5 rounded">#{ticket.id}</span>
                    {ticket.status_name && (
                      <Badge
                        variant="secondary"
                        className="text-xs"
                        style={{ 
                          backgroundColor: `${ticket.status_color}20`,
                          color: ticket.status_color,
                          borderColor: ticket.status_color
                        }}
                      >
                        {ticket.status_name}
                      </Badge>
                    )}
                    {isCritical && (
                      <Badge variant="destructive" className="text-xs font-bold uppercase flex items-center gap-1 animate-pulse">
                        <Icon name="AlertTriangle" size={12} />
                        Критично
                      </Badge>
                    )}
                    {ticket.unread_comments && ticket.unread_comments > 0 && (
                      <Badge variant="destructive" className="flex items-center gap-1 animate-pulse text-xs">
                        <Icon name="MessageCircle" size={12} />
                        {ticket.unread_comments}
                      </Badge>
                    )}
                  </div>
                  <h3 className="font-semibold text-base line-clamp-1">
                    {ticket.status_name === 'На согласовании' && '🔔 '}
                    {ticket.status_name === 'Отклонена' && '❌ '}
                    {ticket.status_name === 'Одобрена' && '✅ '}
                    {ticket.title}
                  </h3>
                  {ticket.description && (
                    <p className="text-sm text-muted-foreground mt-1 line-clamp-2">
                      {ticket.description.replace(/<[^>]*>/g, '')}
                    </p>
                  )}
                </div>
              </div>
            </div>

            <div className="border-t border-white/5 pt-2.5 mt-1 space-y-2">
                <div className="flex flex-wrap items-center gap-1.5 text-xs">
                  {(ticket.customer_name || ticket.creator_name) && (() => {
                    const phone = getPhoneFromTicket(ticket);
                    return (
                      <>
                        <span className="inline-flex items-center gap-1.5 bg-blue-500/10 text-blue-400 rounded-md px-2 py-1">
                          {ticket.creator_photo_url ? (
                            <img src={ticket.creator_photo_url} alt="" className="w-4 h-4 rounded-full object-cover" />
                          ) : (
                            <Icon name="User" size={11} />
                          )}
                          {ticket.customer_name || ticket.creator_name}
                        </span>
                        {canCallPhone && phone && (
                          <a
                            href={`tel:+${phone}`}
                            onClick={(e) => e.stopPropagation()}
                            title={phoneDisplay(`+${phone}`) || phone}
                            className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-green-500/15 hover:bg-green-500/25 active:bg-green-500/35 transition-colors -ml-0.5"
                          >
                            <Icon name="Phone" size={11} className="text-green-600" />
                          </a>
                        )}
                      </>
                    );
                  })()}
                  <span className={`inline-flex items-center gap-1.5 rounded-md px-2 py-1 ${(ticket.assigned_to_name || ticket.assignee_name) ? 'bg-muted/60 text-muted-foreground' : 'bg-orange-500/10 text-orange-500'}`}>
                    {ticket.assignee_photo_url ? (
                      <img src={ticket.assignee_photo_url} alt="" className="w-4 h-4 rounded-full object-cover" />
                    ) : (
                      <Icon name={(ticket.assigned_to_name || ticket.assignee_name) ? "UserCheck" : "UserX"} size={11} />
                    )}
                    {ticket.assigned_to_name || ticket.assignee_name || 'Не назначен'}
                  </span>
                  {ticket.department_name && (
                    <span className="inline-flex items-center gap-1.5 bg-muted/60 text-muted-foreground rounded-md px-2 py-1">
                      <Icon name="Building" size={11} />
                      {ticket.department_name}
                    </span>
                  )}
                  {ticket.ticket_service && (
                    <span className="inline-flex items-center gap-1.5 bg-muted/60 text-muted-foreground rounded-md px-2 py-1">
                      <Icon name="Tag" size={11} />
                      {ticket.ticket_service.name}
                    </span>
                  )}
                  {ticket.services && ticket.services.length > 0 && (
                    <span className="inline-flex items-center gap-1.5 bg-muted/60 text-muted-foreground rounded-md px-2 py-1">
                      <Icon name="Wrench" size={11} />
                      {ticket.services.map(s => s.name).join(', ')}
                    </span>
                  )}
                  {ticket.priority_name && (
                    <span
                      className="inline-flex items-center gap-1.5 rounded-md px-2 py-1 font-medium"
                      style={{
                        backgroundColor: `${ticket.priority_color}15`,
                        color: ticket.priority_color,
                      }}
                    >
                      <div className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: ticket.priority_color }} />
                      {ticket.priority_name}
                    </span>
                  )}
                  {ticket.created_at && (
                    <span className="inline-flex items-center gap-1.5 text-muted-foreground/70 ml-auto text-[11px]">
                      <Icon name="Clock" size={11} />
                      {new Date(ticket.created_at).toLocaleDateString('ru-RU', {
                        day: 'numeric',
                        month: 'short',
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </span>
                  )}
                </div>
              </div>

              {ticket.due_date && (() => {
                const deadline = getDeadlineProgress(ticket.due_date);
                if (!deadline) return null;
                
                return (
                  <div className="space-y-1.5 mt-2">
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-muted-foreground flex items-center gap-1.5">
                        <Icon name="Calendar" size={12} />
                        Дедлайн: {new Date(ticket.due_date).toLocaleDateString('ru-RU', {
                          day: 'numeric',
                          month: 'short',
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                      </span>
                      <span className="font-medium" style={{ color: deadline.color }}>
                        {deadline.label}
                      </span>
                    </div>
                    <div className="h-1.5 bg-muted rounded-full overflow-hidden">
                      <div
                        className="h-full transition-all duration-300"
                        style={{ width: `${deadline.percent}%`, backgroundColor: deadline.color }}
                      />
                    </div>
                  </div>
                );
              })()}
          </div>
        </Card>
        );
      })}
      </div>

      {totalPages > 1 && (
        <div className="flex items-center justify-between pt-2">
          <span className="text-sm text-muted-foreground">
            Заявок: {totalTickets}, страница {page} из {totalPages}
          </span>
          <div className="flex items-center gap-1">
            <button
              onClick={() => onPageChange?.(1)}
              disabled={page === 1}
              className="px-2 py-1 rounded text-sm disabled:opacity-40 hover:bg-muted transition-colors"
            >
              «
            </button>
            <button
              onClick={() => onPageChange?.(page - 1)}
              disabled={page === 1}
              className="px-3 py-1 rounded text-sm disabled:opacity-40 hover:bg-muted transition-colors"
            >
              ‹
            </button>
            {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
              let p: number;
              if (totalPages <= 5) {
                p = i + 1;
              } else if (page <= 3) {
                p = i + 1;
              } else if (page >= totalPages - 2) {
                p = totalPages - 4 + i;
              } else {
                p = page - 2 + i;
              }
              return (
                <button
                  key={p}
                  onClick={() => onPageChange?.(p)}
                  className={`px-3 py-1 rounded text-sm transition-colors ${
                    p === page
                      ? 'bg-primary text-primary-foreground'
                      : 'hover:bg-muted'
                  }`}
                >
                  {p}
                </button>
              );
            })}
            <button
              onClick={() => onPageChange?.(page + 1)}
              disabled={page === totalPages}
              className="px-3 py-1 rounded text-sm disabled:opacity-40 hover:bg-muted transition-colors"
            >
              ›
            </button>
            <button
              onClick={() => onPageChange?.(totalPages)}
              disabled={page === totalPages}
              className="px-2 py-1 rounded text-sm disabled:opacity-40 hover:bg-muted transition-colors"
            >
              »
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default TicketsList;