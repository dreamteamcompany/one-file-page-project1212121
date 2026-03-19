import { Badge } from '@/components/ui/badge';
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
  assigned_to_name?: string;
  assigned_to?: number;
  created_by?: number;
  unread_comments?: number;
  has_response?: boolean;
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

const getPriorityIcon = (name?: string) => {
  if (!name) return null;
  const lower = name.toLowerCase();
  if (lower.includes('критич') || lower.includes('высок') || lower.includes('срочн'))
    return { icon: 'ChevronUp', className: 'text-red-400' };
  if (lower.includes('средн') || lower.includes('норм'))
    return { icon: 'Equal', className: 'text-yellow-400' };
  if (lower.includes('низк'))
    return { icon: 'ChevronDown', className: 'text-blue-400' };
  return { icon: 'Minus', className: 'text-muted-foreground' };
};

const getStatusDot = (color?: string) => {
  if (!color) return 'bg-muted-foreground';
  return '';
};

const formatDate = (dateStr?: string) => {
  if (!dateStr) return '';
  const date = new Date(dateStr);
  const now = new Date();
  const diff = now.getTime() - date.getTime();
  const mins = Math.floor(diff / 60000);
  const hours = Math.floor(diff / 3600000);
  const days = Math.floor(diff / 86400000);

  if (mins < 1) return 'только что';
  if (mins < 60) return `${mins} мин`;
  if (hours < 24) return `${hours} ч`;
  if (days < 7) return `${days} д`;
  return date.toLocaleDateString('ru-RU', { day: 'numeric', month: 'short' });
};

const getDeadlineInfo = (dueDate?: string) => {
  if (!dueDate) return null;
  const now = new Date().getTime();
  const due = new Date(dueDate).getTime();
  const timeLeft = due - now;

  if (timeLeft < 0) return { label: 'Просрочена', color: 'text-red-400', bgColor: 'bg-red-500/10' };
  const hours = Math.floor(timeLeft / 3600000);
  const days = Math.floor(timeLeft / 86400000);

  if (days === 0) return { label: `${hours}ч`, color: 'text-red-400', bgColor: 'bg-red-500/10' };
  if (days <= 2) return { label: `${days}д`, color: 'text-orange-400', bgColor: 'bg-orange-500/10' };
  if (days <= 7) return { label: `${days}д`, color: 'text-yellow-400', bgColor: 'bg-yellow-500/10' };
  return { label: `${days}д`, color: 'text-green-400', bgColor: 'bg-green-500/10' };
};

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

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="flex flex-col items-center gap-3">
          <div className="animate-spin rounded-full h-8 w-8 border-2 border-primary border-t-transparent"></div>
          <p className="text-sm text-muted-foreground">Загрузка заявок...</p>
        </div>
      </div>
    );
  }

  if (tickets.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-center">
        <div className="w-12 h-12 rounded-xl bg-muted/50 flex items-center justify-center mb-4">
          <Icon name="Inbox" size={24} className="text-muted-foreground" />
        </div>
        <p className="text-sm font-medium mb-1">Нет заявок</p>
        <p className="text-xs text-muted-foreground">Создайте первую заявку, нажав кнопку выше</p>
      </div>
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
    <div className="space-y-2">
      {/* Шапка таблицы */}
      <div className="hidden sm:grid sm:grid-cols-[auto_1fr_auto_auto_auto_auto] items-center gap-3 px-3 py-2 text-xs font-medium text-muted-foreground uppercase tracking-wider">
        <div className="w-12 flex items-center gap-2">
          {bulkMode ? (
            <Checkbox
              checked={allSelected}
              onCheckedChange={() => onToggleAll?.(sortedTickets.map(t => t.id), allSelected)}
            />
          ) : (
            <span className="pl-1">ID</span>
          )}
        </div>
        <div>Заявка</div>
        <div className="w-20 text-center">Статус</div>
        <div className="w-28">Исполнитель</div>
        <div className="w-20 text-center">Приоритет</div>
        <div className="w-16 text-right">Дата</div>
      </div>

      {/* Список строк */}
      <div className="rounded-xl border border-border/50 overflow-hidden bg-card/30 backdrop-blur-sm">
        {sortedTickets.map((ticket, index) => {
          const isCritical = ticket.priority_name?.toLowerCase().includes('критич');
          const priority = getPriorityIcon(ticket.priority_name);
          const deadline = getDeadlineInfo(ticket.due_date);
          const isSelected = selectedTicketIds.includes(ticket.id);

          return (
            <div
              key={ticket.id}
              className={`
                group relative flex items-center sm:grid sm:grid-cols-[auto_1fr_auto_auto_auto_auto] gap-2 sm:gap-3
                px-3 py-2.5 cursor-pointer
                transition-all duration-150
                hover:bg-white/[0.04]
                ${index !== sortedTickets.length - 1 ? 'border-b border-border/30' : ''}
                ${isCritical ? 'bg-red-500/[0.06]' : ''}
                ${isSelected ? 'bg-primary/[0.08]' : ''}
              `}
              onClick={(e) => {
                if (bulkMode && onToggleTicket) {
                  e.stopPropagation();
                  onToggleTicket(ticket.id);
                } else {
                  onTicketClick(ticket);
                }
              }}
            >
              {/* ID / Checkbox */}
              <div className="w-12 flex items-center gap-2 flex-shrink-0">
                {bulkMode && onToggleTicket ? (
                  <Checkbox
                    checked={isSelected}
                    onCheckedChange={() => onToggleTicket(ticket.id)}
                    onClick={(e) => e.stopPropagation()}
                  />
                ) : (
                  <span className="text-xs font-mono text-muted-foreground/70 group-hover:text-muted-foreground transition-colors">
                    {ticket.id}
                  </span>
                )}
              </div>

              {/* Заголовок + описание (мобильная версия включает всё) */}
              <div className="flex-1 min-w-0 flex items-center gap-2.5">
                {/* Приоритет иконка (только мобильная) */}
                {priority && (
                  <div className={`sm:hidden flex-shrink-0 ${priority.className}`}>
                    <Icon name={priority.icon} size={14} />
                  </div>
                )}

                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium truncate group-hover:text-primary transition-colors">
                      {ticket.title}
                    </span>

                    {/* Уведомления */}
                    {ticket.has_response && ticket.created_by === currentUserId && (
                      <span className="flex-shrink-0 w-2 h-2 rounded-full bg-blue-500 animate-pulse" title="Есть ответ" />
                    )}
                    {ticket.unread_comments && ticket.unread_comments > 0 && (
                      <span className="flex-shrink-0 inline-flex items-center justify-center min-w-[18px] h-[18px] rounded-full bg-destructive text-destructive-foreground text-[10px] font-semibold px-1">
                        {ticket.unread_comments}
                      </span>
                    )}
                    {isCritical && (
                      <Icon name="AlertTriangle" size={13} className="flex-shrink-0 text-red-400 animate-pulse" />
                    )}
                  </div>

                  {/* Мета для десктопа: описание + теги */}
                  <div className="hidden sm:flex items-center gap-2 mt-0.5">
                    {ticket.category_name && (
                      <span className="text-[11px] text-muted-foreground/60">{ticket.category_name}</span>
                    )}
                    {ticket.ticket_service && (
                      <>
                        <span className="text-muted-foreground/30">·</span>
                        <span className="text-[11px] text-muted-foreground/60">{ticket.ticket_service.name}</span>
                      </>
                    )}
                    {ticket.department_name && (
                      <>
                        <span className="text-muted-foreground/30">·</span>
                        <span className="text-[11px] text-muted-foreground/60">{ticket.department_name}</span>
                      </>
                    )}
                    {deadline && (
                      <>
                        <span className="text-muted-foreground/30">·</span>
                        <span className={`text-[11px] font-medium ${deadline.color}`}>
                          <Icon name="Clock" size={10} className="inline mr-0.5 -mt-px" />
                          {deadline.label}
                        </span>
                      </>
                    )}
                  </div>

                  {/* Мобильный подзаголовок */}
                  <div className="flex sm:hidden items-center gap-1.5 mt-0.5 flex-wrap">
                    {ticket.status_name && (
                      <div className="flex items-center gap-1">
                        <div
                          className={`w-2 h-2 rounded-full flex-shrink-0 ${getStatusDot(ticket.status_color)}`}
                          style={ticket.status_color ? { backgroundColor: ticket.status_color } : {}}
                        />
                        <span className="text-[11px] text-muted-foreground">{ticket.status_name}</span>
                      </div>
                    )}
                    {ticket.assigned_to_name && (
                      <>
                        <span className="text-muted-foreground/30">·</span>
                        <span className="text-[11px] text-muted-foreground">{ticket.assigned_to_name}</span>
                      </>
                    )}
                    {ticket.created_at && (
                      <>
                        <span className="text-muted-foreground/30">·</span>
                        <span className="text-[11px] text-muted-foreground">{formatDate(ticket.created_at)}</span>
                      </>
                    )}
                  </div>
                </div>
              </div>

              {/* Статус — десктоп */}
              <div className="hidden sm:flex w-20 items-center justify-center">
                {ticket.status_name && (
                  <div className="flex items-center gap-1.5">
                    <div
                      className={`w-2 h-2 rounded-full flex-shrink-0 ${getStatusDot(ticket.status_color)}`}
                      style={ticket.status_color ? { backgroundColor: ticket.status_color } : {}}
                    />
                    <span className="text-xs text-muted-foreground truncate max-w-[70px]">{ticket.status_name}</span>
                  </div>
                )}
              </div>

              {/* Исполнитель — десктоп */}
              <div className="hidden sm:flex w-28 items-center">
                {ticket.assigned_to_name ? (
                  <div className="flex items-center gap-1.5">
                    <div className="w-5 h-5 rounded-full bg-primary/20 flex items-center justify-center flex-shrink-0">
                      <span className="text-[10px] font-semibold text-primary">
                        {ticket.assigned_to_name.charAt(0).toUpperCase()}
                      </span>
                    </div>
                    <span className="text-xs text-muted-foreground truncate">{ticket.assigned_to_name}</span>
                  </div>
                ) : (
                  <span className="text-xs text-muted-foreground/40">—</span>
                )}
              </div>

              {/* Приоритет — десктоп */}
              <div className="hidden sm:flex w-20 items-center justify-center">
                {priority && (
                  <div className={`flex items-center gap-1 ${priority.className}`} title={ticket.priority_name}>
                    <Icon name={priority.icon} size={14} />
                    {isCritical && (
                      <span className="text-[10px] font-bold uppercase tracking-wide">!</span>
                    )}
                  </div>
                )}
              </div>

              {/* Дата — десктоп */}
              <div className="hidden sm:flex w-16 items-center justify-end">
                <span className="text-xs text-muted-foreground/60">{formatDate(ticket.created_at)}</span>
              </div>
            </div>
          );
        })}
      </div>

      {/* Пагинация */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between pt-1">
          <span className="text-xs text-muted-foreground">
            {totalTickets} заявок · стр. {page}/{totalPages}
          </span>
          <div className="flex items-center gap-0.5">
            <button
              onClick={() => onPageChange?.(page - 1)}
              disabled={page === 1}
              className="p-1.5 rounded-lg text-sm disabled:opacity-30 hover:bg-muted/50 transition-colors"
            >
              <Icon name="ChevronLeft" size={14} />
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
                  className={`w-7 h-7 rounded-lg text-xs font-medium transition-colors ${
                    p === page
                      ? 'bg-primary text-primary-foreground'
                      : 'text-muted-foreground hover:bg-muted/50'
                  }`}
                >
                  {p}
                </button>
              );
            })}
            <button
              onClick={() => onPageChange?.(page + 1)}
              disabled={page === totalPages}
              className="p-1.5 rounded-lg text-sm disabled:opacity-30 hover:bg-muted/50 transition-colors"
            >
              <Icon name="ChevronRight" size={14} />
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default TicketsList;
