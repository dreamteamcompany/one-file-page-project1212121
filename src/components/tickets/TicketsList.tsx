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
          {ticket.priority_color && (
            <div
              className="pointer-events-none absolute left-0 top-0 bottom-0 w-1.5 rounded-l-lg z-10"
              style={{ backgroundColor: ticket.priority_color }}
              aria-hidden="true"
            />
          )}
          <div className="pointer-events-none hidden md:block absolute inset-y-3 left-1/2 w-0.5 bg-white/10 z-0" aria-hidden="true" />
          <div className="pointer-events-none hidden md:block absolute inset-y-3 left-[63%] w-0.5 bg-white/10 z-0" aria-hidden="true" />
          <div className="pointer-events-none hidden md:block absolute inset-y-3 right-[24%] w-0.5 bg-white/10 z-0" aria-hidden="true" />

          {ticket.due_date && (() => {
            const deadline = getDeadlineProgress(ticket.due_date);
            if (!deadline) return null;
            const oneDay = 24 * 60 * 60 * 1000;
            const oneHour = 60 * 60 * 1000;
            const timeLeft = new Date(ticket.due_date).getTime() - new Date().getTime();
            let leftLabel = '';
            if (timeLeft < 0) {
              leftLabel = 'Просрочено';
            } else {
              const daysLeft = Math.floor(timeLeft / oneDay);
              const hoursLeft = Math.floor((timeLeft % oneDay) / oneHour);
              if (daysLeft === 0) {
                leftLabel = `Осталось: ${hoursLeft} ч`;
              } else {
                leftLabel = `Осталось: ${daysLeft} д ${hoursLeft} ч`;
              }
            }
            return (
              <div className="hidden md:flex absolute inset-y-3 left-[76%] right-0 z-20 flex-col items-start justify-center gap-1.5 px-4 pointer-events-none">
                <span className="text-sm font-semibold truncate max-w-full" style={{ color: deadline.color }}>
                  {deadline.label}
                </span>
                <div className="h-3 w-full flex gap-1">
                  {Array.from({ length: 5 }).map((_, i) => {
                    const filled = i < Math.round((deadline.percent / 100) * 5);
                    return (
                      <div
                        key={i}
                        className="flex-1 h-full rounded-sm transition-colors duration-300"
                        style={{ backgroundColor: filled ? deadline.color : 'rgba(255,255,255,0.08)' }}
                      />
                    );
                  })}
                </div>
                <span className="text-xs text-muted-foreground truncate max-w-full">
                  {leftLabel}
                </span>
              </div>
            );
          })()}

          <div className="hidden md:flex absolute inset-y-3 left-[63%] right-[24%] z-20 flex-col items-start justify-center gap-2 px-4 pointer-events-none">
            {ticket.created_at && (
              <div className="flex flex-col items-start gap-0.5 max-w-full">
                <span className="text-xs text-muted-foreground">Дата создания</span>
                <span className="inline-flex items-center gap-1.5 bg-muted/60 text-white rounded-md px-2 py-1 text-xs max-w-full">
                  <Icon name="Clock" size={11} className="flex-shrink-0" />
                  <span className="truncate">
                    {new Date(ticket.created_at).toLocaleDateString('ru-RU', {
                      day: 'numeric',
                      month: 'short',
                      year: 'numeric',
                      hour: '2-digit',
                      minute: '2-digit',
                    })}
                  </span>
                </span>
              </div>
            )}
            {ticket.due_date && (
              <div className="flex flex-col items-start gap-0.5 max-w-full">
                <span className="text-xs text-muted-foreground">Дедлайн</span>
                <span className="inline-flex items-center gap-1.5 bg-muted/60 text-white rounded-md px-2 py-1 text-xs max-w-full">
                  <Icon name="Calendar" size={11} className="flex-shrink-0" />
                  <span className="truncate">
                    {new Date(ticket.due_date).toLocaleDateString('ru-RU', {
                      day: 'numeric',
                      month: 'short',
                      year: 'numeric',
                      hour: '2-digit',
                      minute: '2-digit',
                    })}
                  </span>
                </span>
              </div>
            )}
          </div>

          <div className="hidden md:flex absolute inset-y-3 left-[50%] right-[37%] z-20 flex-col items-start justify-center gap-2 px-4 pointer-events-none">
            {ticket.status_name && (
              <div className="flex flex-col items-start gap-0.5 max-w-full">
                <span className="text-xs text-muted-foreground">Статус</span>
                <Badge
                  variant="secondary"
                  className="text-xs max-w-full truncate"
                  style={{
                    backgroundColor: `${ticket.status_color}20`,
                    color: ticket.status_color,
                    borderColor: ticket.status_color,
                  }}
                >
                  {ticket.status_name}
                </Badge>
              </div>
            )}
            {(ticket.customer_name || ticket.creator_name) && (
              <div className="flex flex-col items-start gap-0.5 max-w-full">
                <span className="text-xs text-muted-foreground">Заказчик</span>
                <span className="inline-flex items-center gap-1.5 bg-blue-500/10 text-blue-400 rounded-md px-2 py-1 text-xs max-w-full">
                  {ticket.creator_photo_url ? (
                    <img src={ticket.creator_photo_url} alt="" className="w-4 h-4 rounded-full object-cover flex-shrink-0" />
                  ) : (
                    <Icon name="User" size={11} className="flex-shrink-0" />
                  )}
                  <span className="truncate">{ticket.customer_name || ticket.creator_name}</span>
                </span>
              </div>
            )}
            <div className="flex flex-col items-start gap-0.5 max-w-full">
              <span className="text-xs text-muted-foreground">Исполнитель</span>
              <span className={`inline-flex items-center gap-1.5 rounded-md px-2 py-1 text-xs max-w-full ${(ticket.assigned_to_name || ticket.assignee_name) ? 'bg-muted/60 text-muted-foreground' : 'bg-orange-500/10 text-orange-500'}`}>
                {ticket.assignee_photo_url ? (
                  <img src={ticket.assignee_photo_url} alt="" className="w-4 h-4 rounded-full object-cover flex-shrink-0" />
                ) : (
                  <Icon name={(ticket.assigned_to_name || ticket.assignee_name) ? "UserCheck" : "UserX"} size={11} className="flex-shrink-0" />
                )}
                <span className="truncate">{ticket.assigned_to_name || ticket.assignee_name || 'Не назначен'}</span>
              </span>
            </div>
          </div>

          <div className="space-y-2 relative z-10">
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
                    {ticket.has_new && (
                      <span
                        className="relative inline-flex items-center justify-center flex-shrink-0 animate-pulse"
                        title="Новые сообщения"
                        aria-label="Новые сообщения"
                      >
                        <span className="absolute inline-flex h-3.5 w-3.5 rounded-full opacity-60" style={{ backgroundColor: '#f97316' }} />
                        <span className="relative inline-flex h-2.5 w-2.5 rounded-full" style={{ backgroundColor: '#f97316', boxShadow: '0 0 0 2px #f97316, 0 0 8px rgba(249,115,22,0.8)' }} />
                      </span>
                    )}
                    <span className="text-xs font-mono text-white bg-muted px-2 py-0.5 rounded">#{ticket.id}</span>
                    {isCritical && (
                      <Badge variant="destructive" className="text-xs font-bold uppercase flex items-center gap-1 animate-pulse">
                        <Icon name="AlertTriangle" size={12} />
                        Критично
                      </Badge>
                    )}
                    {!!ticket.unread_mentions && ticket.unread_mentions > 0 && (
                      <Badge className="flex items-center gap-1 text-xs font-bold uppercase bg-purple-500 hover:bg-purple-600 text-white animate-pulse">
                        <Icon name="AtSign" size={12} />
                        {ticket.unread_mentions}
                      </Badge>
                    )}
                    {ticket.client_replied && (
                      <Badge
                        className="flex items-center gap-1 text-xs font-bold uppercase text-white animate-pulse"
                        style={{ backgroundColor: '#f97316' }}
                        title={
                          ticket.client_replied_at
                            ? `Последний ответ клиента: ${new Date(ticket.client_replied_at).toLocaleString('ru-RU', {
                                day: 'numeric',
                                month: 'short',
                                year: 'numeric',
                                hour: '2-digit',
                                minute: '2-digit',
                              })}`
                            : 'Клиент оставил новый комментарий'
                        }
                      >
                        <Icon name="MessageSquareReply" size={12} />
                        Новый комментарий
                      </Badge>
                    )}
                  </div>
                  <h3 className="font-semibold text-base line-clamp-2 md:line-clamp-1 md:max-w-[calc(50%-1.5rem)] break-all">
                    {ticket.status_name === 'На согласовании' && '🔔 '}
                    {ticket.status_name === 'Отклонена' && '❌ '}
                    {ticket.status_name === 'Одобрена' && '✅ '}
                    {ticket.title}
                  </h3>
                  {ticket.description && (
                    <p className="text-sm text-muted-foreground mt-1 line-clamp-2 md:max-w-[calc(50%-1.5rem)] break-all">
                      {ticket.description.replace(/<[^>]*>/g, '')}
                    </p>
                  )}
                </div>
              </div>
            </div>

            <div className="md:hidden pt-2.5 mt-1 space-y-2 border-t border-white/10">
              <div className="flex flex-wrap items-center gap-2 text-xs">
                {ticket.status_name && (
                  <Badge
                    variant="secondary"
                    className="text-xs max-w-full truncate"
                    style={{
                      backgroundColor: `${ticket.status_color}20`,
                      color: ticket.status_color,
                      borderColor: ticket.status_color,
                    }}
                  >
                    {ticket.status_name}
                  </Badge>
                )}
                {(ticket.customer_name || ticket.creator_name) && (
                  <span className="inline-flex items-center gap-1.5 bg-blue-500/10 text-blue-400 rounded-md px-2 py-1 text-xs max-w-full">
                    {ticket.creator_photo_url ? (
                      <img src={ticket.creator_photo_url} alt="" className="w-4 h-4 rounded-full object-cover flex-shrink-0" />
                    ) : (
                      <Icon name="User" size={11} className="flex-shrink-0" />
                    )}
                    <span className="truncate">{ticket.customer_name || ticket.creator_name}</span>
                  </span>
                )}
                <span className={`inline-flex items-center gap-1.5 rounded-md px-2 py-1 text-xs max-w-full ${(ticket.assigned_to_name || ticket.assignee_name) ? 'bg-muted/60 text-muted-foreground' : 'bg-orange-500/10 text-orange-500'}`}>
                  {ticket.assignee_photo_url ? (
                    <img src={ticket.assignee_photo_url} alt="" className="w-4 h-4 rounded-full object-cover flex-shrink-0" />
                  ) : (
                    <Icon name={(ticket.assigned_to_name || ticket.assignee_name) ? "UserCheck" : "UserX"} size={11} className="flex-shrink-0" />
                  )}
                  <span className="truncate">{ticket.assigned_to_name || ticket.assignee_name || 'Не назначен'}</span>
                </span>
              </div>
              <div className="flex flex-wrap items-center gap-2 text-xs">
                {ticket.created_at && (
                  <span className="inline-flex items-center gap-1.5 bg-muted/60 text-white rounded-md px-2 py-1 text-xs">
                    <Icon name="Clock" size={11} className="flex-shrink-0" />
                    <span className="truncate">
                      {new Date(ticket.created_at).toLocaleDateString('ru-RU', {
                        day: 'numeric',
                        month: 'short',
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </span>
                  </span>
                )}
                {ticket.due_date && (
                  <span className="inline-flex items-center gap-1.5 bg-muted/60 text-white rounded-md px-2 py-1 text-xs">
                    <Icon name="Calendar" size={11} className="flex-shrink-0" />
                    <span className="truncate">
                      {new Date(ticket.due_date).toLocaleDateString('ru-RU', {
                        day: 'numeric',
                        month: 'short',
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </span>
                  </span>
                )}
                {ticket.due_date && (() => {
                  const deadline = getDeadlineProgress(ticket.due_date);
                  if (!deadline) return null;
                  return (
                    <span
                      className="inline-flex items-center gap-1.5 rounded-md px-2 py-1 text-xs font-medium"
                      style={{
                        backgroundColor: `${deadline.color}20`,
                        color: deadline.color,
                      }}
                    >
                      <Icon name="Timer" size={11} className="flex-shrink-0" />
                      <span className="truncate">{deadline.label}</span>
                    </span>
                  );
                })()}
              </div>
            </div>

            <div className="pt-2.5 mt-1 space-y-2">
                <div className="flex flex-wrap items-center gap-1.5 text-xs">
                  {(() => {
                    const phone = getPhoneFromTicket(ticket);
                    if (!canCallPhone || !phone) return null;
                    return (
                      <a
                        href={`tel:+${phone}`}
                        onClick={(e) => e.stopPropagation()}
                        title={phoneDisplay(`+${phone}`) || phone}
                        className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-green-500/15 hover:bg-green-500/25 active:bg-green-500/35 transition-colors"
                      >
                        <Icon name="Phone" size={11} className="text-green-600" />
                      </a>
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