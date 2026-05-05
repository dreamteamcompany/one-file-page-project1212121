import { Card } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import Icon from '@/components/ui/icon';

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

        const deadline = getDeadlineProgress(ticket.due_date);
        const segments = 5;
        const filledSegments = deadline ? Math.max(1, Math.round((deadline.percent / 100) * segments)) : 0;

        let hoursLeft: number | null = null;
        if (ticket.due_date) {
          const diff = new Date(ticket.due_date).getTime() - Date.now();
          if (diff > 0) hoursLeft = Math.floor(diff / 3600000);
        }
        const isUrgent = hoursLeft !== null && hoursLeft < 24;
        const showNewComment = !!(ticket.has_new || ticket.client_replied || (ticket.unread_comments && ticket.unread_comments > 0));

        return (
        <div
          key={ticket.id}
          className={`group relative w-full overflow-hidden rounded-xl bg-[#0f1729] text-slate-200 border border-slate-700/60 hover:border-slate-500/80 transition-all cursor-pointer ${
            isCritical ? 'border-red-500/80' : ''
          } ${
            selectedTicketIds.includes(ticket.id) ? 'ring-2 ring-primary' : ''
          }`}
          style={isCritical ? {
            boxShadow: '0 0 20px rgba(239, 68, 68, 0.35), 0 0 40px rgba(239, 68, 68, 0.15)',
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
          <div className="flex items-start gap-6 px-5 py-4">
            {bulkMode && onToggleTicket && (
              <div className="flex items-center pt-1">
                <Checkbox
                  checked={selectedTicketIds.includes(ticket.id)}
                  onCheckedChange={(e) => { if (e) onToggleTicket(ticket.id); }}
                  onClick={(e) => e.stopPropagation()}
                />
              </div>
            )}

            {/* Левая часть: ID + бейджи / заголовок / описание / теги */}
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-[12px] font-medium text-slate-400">#{ticket.id}</span>
                {ticket.status_name && (
                  <span className="inline-flex items-center text-[11px] font-medium rounded px-2 py-[3px] bg-slate-700/70 text-slate-200">
                    {ticket.status_name}
                  </span>
                )}
                {showNewComment && (
                  <span className="inline-flex items-center gap-1 text-[10px] font-bold uppercase tracking-wide rounded px-2 py-[3px] bg-cyan-500/15 text-cyan-400">
                    <Icon name="MessageSquare" size={11} />
                    Новый комментарий
                  </span>
                )}
                {isCritical && (
                  <span className="inline-flex items-center gap-1 text-[10px] font-bold uppercase tracking-wide rounded px-2 py-[3px] bg-red-500/20 text-red-400">
                    <Icon name="AlertTriangle" size={11} />
                    Критично
                  </span>
                )}
                {!!ticket.unread_mentions && ticket.unread_mentions > 0 && (
                  <span className="inline-flex items-center gap-1 text-[10px] font-bold uppercase tracking-wide rounded px-2 py-[3px] bg-purple-500/20 text-purple-300">
                    <Icon name="AtSign" size={11} />
                    {ticket.unread_mentions}
                  </span>
                )}
              </div>

              <h3 className="mt-2 font-semibold text-[16px] text-white line-clamp-1 leading-tight">
                {ticket.title}
              </h3>
              {ticket.description && (
                <p className="text-[13px] text-slate-400 mt-1 line-clamp-2 leading-snug">
                  {ticket.description.replace(/<[^>]*>/g, '')}
                </p>
              )}

              <div className="flex items-center gap-3 mt-3 flex-wrap">
                {ticket.category_name && (
                  <span className="inline-flex items-center gap-1.5 text-[12px] text-slate-300">
                    <Icon name={ticket.category_icon || 'Tag'} size={12} className="text-slate-400" />
                    {ticket.category_name}
                  </span>
                )}
                {ticket.ticket_service && (
                  <span className="inline-flex items-center gap-1.5 text-[12px] text-slate-300">
                    <Icon name="Wrench" size={12} className="text-slate-400" />
                    {ticket.ticket_service.name}
                  </span>
                )}
                {ticket.priority_name && (
                  <span
                    className="inline-flex items-center gap-1.5 text-[12px]"
                    style={{ color: ticket.priority_color || '#60a5fa' }}
                  >
                    <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: ticket.priority_color || '#60a5fa' }} />
                    {ticket.priority_name}
                  </span>
                )}
              </div>
            </div>

            {/* Колонка: Исполнитель + Статус */}
            <div className="hidden md:flex flex-col gap-3 min-w-[180px] max-w-[200px] pt-0.5">
              <div>
                <div className="text-[12px] text-slate-400 mb-1.5">Исполнитель</div>
                <div className="flex items-center gap-2 text-[14px] text-slate-100">
                  {ticket.assignee_photo_url ? (
                    <img src={ticket.assignee_photo_url} alt="" className="w-6 h-6 rounded-full object-cover" />
                  ) : (
                    <div className="w-6 h-6 rounded-full bg-slate-600/60 flex items-center justify-center">
                      <Icon name="User" size={12} className="text-slate-300" />
                    </div>
                  )}
                  <span className="truncate">
                    {ticket.assigned_to_name || ticket.assignee_name || 'Не назначен'}
                  </span>
                </div>
              </div>

              <div>
                <div className="text-[12px] text-slate-400 mb-1.5">Статус</div>
                <div className="flex items-center gap-2 text-[14px]">
                  <span
                    className="w-2.5 h-2.5 rounded-full"
                    style={{ backgroundColor: (ticket.assigned_to_name || ticket.assignee_name) ? '#22c55e' : '#f59e0b' }}
                  />
                  <span className="text-slate-100 truncate">
                    {(ticket.assigned_to_name || ticket.assignee_name) ? 'Назначен' : 'Не назначен'}
                  </span>
                </div>
              </div>
            </div>

            {/* Колонка: Дедлайн */}
            <div className="hidden md:flex flex-col gap-1.5 min-w-[130px] pt-0.5">
              <div className="text-[12px] text-slate-400">Дедлайн</div>
              {ticket.due_date ? (
                <div className="flex items-center gap-2 text-[14px] text-slate-100">
                  <Icon name="Calendar" size={13} className="text-slate-400" />
                  <span>
                    {new Date(ticket.due_date).toLocaleDateString('ru-RU', {
                      day: 'numeric',
                      month: 'short',
                      hour: '2-digit',
                      minute: '2-digit',
                    })}
                  </span>
                </div>
              ) : (
                <span className="text-[14px] text-slate-500">—</span>
              )}
            </div>

            {/* Колонка: Срочность */}
            <div className="hidden lg:flex flex-col min-w-[200px] pt-0.5">
              {deadline ? (
                <>
                  <div className="text-[14px] font-bold" style={{ color: deadline.color }}>
                    {deadline.label}
                  </div>
                  {isUrgent ? (
                    <div className="mt-2 h-2.5 rounded-sm bg-slate-600/40 overflow-hidden">
                      <div
                        className="h-full rounded-sm"
                        style={{
                          width: '78%',
                          backgroundColor: deadline.color,
                        }}
                      />
                    </div>
                  ) : (
                    <div className="flex items-center gap-1 mt-2">
                      {Array.from({ length: segments }).map((_, i) => (
                        <div
                          key={i}
                          className="h-2.5 flex-1 rounded-sm"
                          style={{
                            backgroundColor: i < filledSegments ? deadline.color : 'rgba(100, 116, 139, 0.35)',
                          }}
                        />
                      ))}
                    </div>
                  )}
                  {hoursLeft !== null && (
                    <div className="text-[12px] text-slate-400 mt-2">
                      Осталось: {hoursLeft} ч
                    </div>
                  )}
                </>
              ) : (
                <span className="text-[12px] text-slate-500">Без дедлайна</span>
              )}
            </div>

            {/* Меню */}
            <div className="flex items-start">
              <button
                type="button"
                onClick={(e) => e.stopPropagation()}
                className="p-1 rounded hover:bg-slate-700/50 text-slate-400 hover:text-slate-200 transition-colors"
                aria-label="Меню"
              >
                <Icon name="MoreHorizontal" size={18} />
              </button>
            </div>
          </div>
        </div>
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