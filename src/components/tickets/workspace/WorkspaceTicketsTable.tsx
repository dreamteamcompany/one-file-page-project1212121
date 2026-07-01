/**
 * Таблица заявок нового интерфейса (рабочее место оператора).
 * Работает с реальными заявками. Клик по строке открывает детали в правой панели.
 */
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import Icon from '@/components/ui/icon';
import type { Ticket } from '@/types';
import { getSlaBadge, SLA_BADGE_CLASSES, SLA_BAR_COLORS } from '@/utils/slaFormat';
import { formatTimeMSK, formatDateOnlyMSK } from '@/utils/dateFormat';

interface WorkspaceTicketsTableProps {
  tickets: Ticket[];
  loading: boolean;
  selectedTicketId: number | null;
  onSelectTicket: (ticket: Ticket) => void;
  page: number;
  totalPages: number;
  totalTickets: number;
  onPageChange: (page: number) => void;
}

const priorityColor = (name?: string): string => {
  const n = (name || '').toLowerCase();
  if (n.includes('выс') || n.includes('крит')) return 'text-red-500';
  if (n.includes('сред')) return 'text-orange-500';
  if (n.includes('низ')) return 'text-green-500';
  return 'text-muted-foreground';
};

const statusPillClass = (ticket: Ticket): string => {
  if (ticket.status_is_reopened) return 'bg-red-100 text-red-700 dark:bg-red-950/40 dark:text-red-300';
  if (ticket.status_is_closed) return 'bg-green-100 text-green-700 dark:bg-green-950/40 dark:text-green-300';
  if (ticket.status_is_waiting_response) return 'bg-violet-100 text-violet-700 dark:bg-violet-950/40 dark:text-violet-300';
  return 'bg-blue-100 text-blue-700 dark:bg-blue-950/40 dark:text-blue-300';
};

const initials = (name?: string): string => {
  if (!name) return '?';
  return name.trim().split(/\s+/).slice(0, 2).map((p) => p[0]).join('').toUpperCase();
};

const WorkspaceTicketsTable = ({
  tickets,
  loading,
  selectedTicketId,
  onSelectTicket,
  page,
  totalPages,
  totalTickets,
  onPageChange,
}: WorkspaceTicketsTableProps) => {
  const pageNumbers = (): (number | '...')[] => {
    if (totalPages <= 7) return Array.from({ length: totalPages }, (_, i) => i + 1);
    const result: (number | '...')[] = [1];
    const start = Math.max(2, page - 1);
    const end = Math.min(totalPages - 1, page + 1);
    if (start > 2) result.push('...');
    for (let i = start; i <= end; i++) result.push(i);
    if (end < totalPages - 1) result.push('...');
    result.push(totalPages);
    return result;
  };

  return (
    <div className="rounded-2xl border border-border bg-card shadow-sm overflow-hidden flex flex-col">
      <div className="grid grid-cols-[70px_90px_60px_1fr_120px_150px_90px] items-center gap-2 border-b border-border px-4 py-3 text-xs font-medium text-muted-foreground">
        <span>SLA</span>
        <span>Приоритет</span>
        <span>#</span>
        <span>Заявка</span>
        <span>Статус</span>
        <span>Исполнитель</span>
        <span className="text-right">Обновлено</span>
      </div>

      <div className="flex-1 overflow-auto">
        {loading ? (
          <div className="flex items-center justify-center py-16">
            <Icon name="Loader2" size={32} className="animate-spin text-primary" />
          </div>
        ) : tickets.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-muted-foreground">
            <Icon name="Inbox" size={40} className="mb-2" />
            <span>Заявок не найдено</span>
          </div>
        ) : (
          tickets.map((ticket) => {
            const sla = getSlaBadge(ticket.due_date);
            const active = ticket.id === selectedTicketId;
            const barColor = sla ? SLA_BAR_COLORS[sla.color] : 'transparent';
            return (
              <button
                key={ticket.id}
                type="button"
                onClick={() => onSelectTicket(ticket)}
                className={`relative grid w-full grid-cols-[70px_90px_60px_1fr_120px_150px_90px] items-center gap-2 border-b border-border px-4 py-3 text-left transition-colors hover:bg-muted/50 ${
                  active ? 'bg-primary/5' : ''
                }`}
              >
                <span
                  className="absolute left-0 top-0 h-full w-1"
                  style={{ backgroundColor: barColor }}
                />
                <div>
                  {sla ? (
                    <span className={`inline-block rounded-md px-2 py-1 text-xs font-semibold ${SLA_BADGE_CLASSES[sla.color]}`}>
                      {sla.text}
                    </span>
                  ) : (
                    <span className="text-xs text-muted-foreground">—</span>
                  )}
                </div>

                <div className={`flex items-center gap-1 text-sm font-medium ${priorityColor(ticket.priority_name)}`}>
                  <Icon name="ChevronDown" size={14} />
                  <span className="truncate">{ticket.priority_name || '—'}</span>
                </div>

                <span className="text-sm text-muted-foreground">#{ticket.id}</span>

                <div className="min-w-0">
                  <div className="truncate text-sm font-medium text-foreground">{ticket.title}</div>
                  {ticket.category_name && (
                    <span className="mt-1 inline-block rounded-md bg-muted px-2 py-0.5 text-xs text-muted-foreground">
                      {ticket.category_name}
                    </span>
                  )}
                </div>

                <div>
                  <span className={`inline-block rounded-full px-2.5 py-1 text-xs font-medium ${statusPillClass(ticket)}`}>
                    {ticket.status_name || 'Новая'}
                  </span>
                </div>

                <div className="flex items-center gap-2 min-w-0">
                  {ticket.assignee_name ? (
                    <>
                      <Avatar className="h-7 w-7 shrink-0">
                        <AvatarImage src={ticket.assignee_photo_url} />
                        <AvatarFallback className="text-[10px]">{initials(ticket.assignee_name)}</AvatarFallback>
                      </Avatar>
                      <span className="truncate text-sm text-foreground">{ticket.assignee_name}</span>
                    </>
                  ) : (
                    <span className="text-sm text-muted-foreground">Не назначен</span>
                  )}
                </div>

                <div className="text-right">
                  <div className="text-sm text-foreground">{formatTimeMSK(ticket.updated_at || ticket.created_at)}</div>
                  <div className="text-xs text-muted-foreground">
                    {formatDateOnlyMSK(ticket.updated_at || ticket.created_at, { longMonth: true, withYear: false })}
                  </div>
                </div>
              </button>
            );
          })
        )}
      </div>

      <div className="flex flex-col gap-3 border-t border-border px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
        <span className="text-sm text-muted-foreground">
          Показано {tickets.length} из {totalTickets}
        </span>
        {totalPages > 1 && (
          <div className="flex items-center gap-1">
            <button
              type="button"
              disabled={page <= 1}
              onClick={() => onPageChange(page - 1)}
              className="flex h-8 w-8 items-center justify-center rounded-lg border border-border text-muted-foreground disabled:opacity-40 hover:bg-muted"
            >
              <Icon name="ChevronLeft" size={16} />
            </button>
            {pageNumbers().map((p, idx) =>
              p === '...' ? (
                <span key={`dots-${idx}`} className="px-2 text-muted-foreground">…</span>
              ) : (
                <button
                  key={p}
                  type="button"
                  onClick={() => onPageChange(p)}
                  className={`flex h-8 min-w-8 items-center justify-center rounded-lg px-2 text-sm ${
                    p === page
                      ? 'bg-primary text-primary-foreground'
                      : 'border border-border text-foreground hover:bg-muted'
                  }`}
                >
                  {p}
                </button>
              )
            )}
            <button
              type="button"
              disabled={page >= totalPages}
              onClick={() => onPageChange(page + 1)}
              className="flex h-8 w-8 items-center justify-center rounded-lg border border-border text-muted-foreground disabled:opacity-40 hover:bg-muted"
            >
              <Icon name="ChevronRight" size={16} />
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default WorkspaceTicketsTable;
