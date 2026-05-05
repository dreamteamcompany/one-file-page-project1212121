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
          className={`hover:shadow-lg transition-all cursor-pointer hover:border-primary/50 relative w-full overflow-hidden ${
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
          {/* Прогресс-бар дедлайна сверху */}
          {ticket.due_date && (() => {
            const deadline = getDeadlineProgress(ticket.due_date);
            if (!deadline) return null;
            return (
              <div className="h-0.5 w-full" style={{ backgroundColor: `${deadline.color}30` }}>
                <div className="h-full transition-all duration-300" style={{ width: `${deadline.percent}%`, backgroundColor: deadline.color }} />
              </div>
            );
          })()}

          <div className="flex items-stretch">
            {/* ===== ЛЕВАЯ ЗОНА: основная информация ===== */}
            <div className="flex-1 min-w-0 px-4 py-3.5">
              {/* Зона А: ID / статус / алерты */}
              <div className="flex items-center gap-2 mb-2">
                {bulkMode && onToggleTicket && (
                  <Checkbox
                    checked={selectedTicketIds.includes(ticket.id)}
                    onCheckedChange={(e) => { if (e) onToggleTicket(ticket.id); }}
                    onClick={(e) => e.stopPropagation()}
                  />
                )}
                {ticket.category_icon && (
                  <div className="w-7 h-7 rounded-md bg-primary/10 flex items-center justify-center flex-shrink-0">
                    <Icon name={ticket.category_icon} size={14} className="text-primary" />
                  </div>
                )}
                <span className="text-xs font-mono text-muted-foreground/70">#{ticket.id}</span>
                {ticket.status_name && (
                  <Badge
                    variant="secondary"
                    className="text-xs px-2 py-0 h-5"
                    style={{ backgroundColor: `${ticket.status_color}20`, color: ticket.status_color }}
                  >
                    {ticket.status_name}
                  </Badge>
                )}
                {isCritical && (
                  <Badge variant="destructive" className="text-[10px] font-bold uppercase px-2 py-0 h-5 flex items-center gap-1 animate-pulse">
                    <Icon name="AlertTriangle" size={10} />
                    Критично
                  </Badge>
                )}
                {ticket.client_replied && (
                  <Badge className="text-[10px] font-bold uppercase px-2 py-0 h-5 flex items-center gap-1 bg-sky-500/15 text-sky-400 hover:bg-sky-500/20 animate-pulse">
                    <Icon name="MessageSquareReply" size={10} />
                    Ответ клиента
                  </Badge>
                )}
                {ticket.has_new && !ticket.client_replied && (
                  <span className="relative inline-flex h-2 w-2 flex-shrink-0" title="Новые сообщения">
                    <span className="absolute inline-flex h-full w-full rounded-full bg-sky-400 opacity-60 animate-ping" />
                    <span className="relative inline-flex h-2 w-2 rounded-full bg-sky-500" />
                  </span>
                )}
                {!!ticket.unread_mentions && ticket.unread_mentions > 0 && (
                  <Badge className="text-[10px] font-bold px-2 py-0 h-5 flex items-center gap-1 bg-purple-500/15 text-purple-400 hover:bg-purple-500/20">
                    <Icon name="AtSign" size={10} />
                    {ticket.unread_mentions}
                  </Badge>
                )}
              </div>

              {/* Зона Б: заголовок + описание */}
              <h3 className="font-semibold text-[15px] leading-snug line-clamp-1 mb-1">
                {ticket.title}
              </h3>
              {ticket.description && (
                <p className="text-sm text-muted-foreground line-clamp-1 mb-2.5">
                  {ticket.description.replace(/<[^>]*>/g, '')}
                </p>
              )}

              {/* Зона В: мета-теги (без дедлайна и исполнителя — они справа) */}
              <div className="flex flex-wrap items-center gap-1.5 text-xs">
                {(ticket.customer_name || ticket.creator_name) && (() => {
                  const phone = getPhoneFromTicket(ticket);
                  return (
                    <>
                      <span className="inline-flex items-center gap-1.5 bg-blue-500/10 text-blue-400 rounded-md px-2 py-1">
                        {ticket.creator_photo_url ? (
                          <img src={ticket.creator_photo_url} alt="" className="w-3.5 h-3.5 rounded-full object-cover" />
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
                          className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-green-500/15 hover:bg-green-500/25 transition-colors -ml-0.5"
                        >
                          <Icon name="Phone" size={11} className="text-green-500" />
                        </a>
                      )}
                    </>
                  );
                })()}
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
                    style={{ backgroundColor: `${ticket.priority_color}15`, color: ticket.priority_color }}
                  >
                    <div className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: ticket.priority_color }} />
                    {ticket.priority_name}
                  </span>
                )}
              </div>
            </div>

            {/* ===== РАЗДЕЛИТЕЛЬ ===== */}
            <div className="hidden md:block w-px bg-border/60 my-3" />

            {/* ===== ПРАВАЯ ЗОНА: Исполнитель / Дедлайн / Создано ===== */}
            <div className="hidden md:flex flex-col justify-center gap-2.5 px-4 py-3.5 min-w-[210px] max-w-[240px]">
              {/* Исполнитель */}
              <div>
                <div className="text-[10px] uppercase tracking-wide text-muted-foreground/60 mb-1">Исполнитель</div>
                <div className={`flex items-center gap-1.5 text-xs ${(ticket.assigned_to_name || ticket.assignee_name) ? 'text-foreground' : 'text-orange-400'}`}>
                  {ticket.assignee_photo_url ? (
                    <img src={ticket.assignee_photo_url} alt="" className="w-5 h-5 rounded-full object-cover" />
                  ) : (
                    <div className={`w-5 h-5 rounded-full flex items-center justify-center ${(ticket.assigned_to_name || ticket.assignee_name) ? 'bg-muted' : 'bg-orange-500/15'}`}>
                      <Icon name={(ticket.assigned_to_name || ticket.assignee_name) ? "UserCheck" : "UserX"} size={11} />
                    </div>
                  )}
                  <span className="truncate font-medium">
                    {ticket.assigned_to_name || ticket.assignee_name || 'Не назначен'}
                  </span>
                </div>
              </div>

              {/* Дедлайн */}
              {ticket.due_date && (() => {
                const deadline = getDeadlineProgress(ticket.due_date);
                return (
                  <div>
                    <div className="text-[10px] uppercase tracking-wide text-muted-foreground/60 mb-1">Дедлайн</div>
                    <div className="flex items-center gap-1.5 text-xs">
                      <Icon name="Calendar" size={11} className="text-muted-foreground" />
                      <span className="text-foreground font-medium">
                        {new Date(ticket.due_date).toLocaleDateString('ru-RU', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}
                      </span>
                    </div>
                    {deadline && (
                      <div className="text-[11px] font-medium mt-0.5" style={{ color: deadline.color }}>
                        {deadline.label}
                      </div>
                    )}
                  </div>
                );
              })()}

              {/* Создано */}
              {ticket.created_at && (
                <div>
                  <div className="text-[10px] uppercase tracking-wide text-muted-foreground/60 mb-1">Создано</div>
                  <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                    <Icon name="Clock" size={11} />
                    {new Date(ticket.created_at).toLocaleDateString('ru-RU', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}
                  </div>
                </div>
              )}
            </div>
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