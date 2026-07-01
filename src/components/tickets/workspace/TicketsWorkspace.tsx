/**
 * Новый интерфейс страницы заявок — «рабочее место оператора».
 * KPI-карточки + таблица заявок + правая панель деталей.
 * Работает на реальных данных, детали открываются справа без перехода на новую страницу.
 */
import { useEffect, useMemo, useState } from 'react';
import Icon from '@/components/ui/icon';
import { Input } from '@/components/ui/input';
import type { Ticket } from '@/types';
import WorkspaceKpiCards, { WorkspaceKpi } from './WorkspaceKpiCards';
import WorkspaceTicketsTable from './WorkspaceTicketsTable';
import WorkspaceDetailsPanel from './WorkspaceDetailsPanel';
import { getSlaBadge } from '@/utils/slaFormat';
import { formatDateOnlyMSK } from '@/utils/dateFormat';

interface TicketsWorkspaceProps {
  tickets: Ticket[];
  loading: boolean;
  searchQuery: string;
  onSearchChange: (value: string) => void;
  currentUserId?: number;
  overdueCount: number;
  closedCount: number;
  onReloadList: () => void;
}

const isClosed = (t: Ticket): boolean => !!t.status_is_closed;

const PAGE_SIZE = 7;

// Проверка, что дата приходится на сегодняшний день (по московскому времени).
const isToday = (date?: string): boolean => {
  if (!date) return false;
  const todayStr = formatDateOnlyMSK(new Date());
  return formatDateOnlyMSK(date) === todayStr;
};

const TicketsWorkspace = ({
  tickets,
  loading,
  searchQuery,
  onSearchChange,
  currentUserId,
  overdueCount,
  closedCount,
  onReloadList,
}: TicketsWorkspaceProps) => {
  const [selectedTicket, setSelectedTicket] = useState<Ticket | null>(null);
  const [gridMode, setGridMode] = useState(false);
  const [localPage, setLocalPage] = useState(1);

  // Клиентская пагинация по 7 заявок на страницу (только для нового интерфейса).
  const localTotalPages = Math.max(1, Math.ceil(tickets.length / PAGE_SIZE));

  // Сброс на первую страницу при изменении набора заявок (поиск/фильтры/серверная страница).
  useEffect(() => {
    setLocalPage(1);
  }, [tickets, searchQuery]);

  const pagedTickets = useMemo(
    () => tickets.slice((localPage - 1) * PAGE_SIZE, localPage * PAGE_SIZE),
    [tickets, localPage]
  );

  const kpi: WorkspaceKpi = useMemo(() => {
    let overdue = overdueCount;
    let slaToday = 0;
    let assignedToMe = 0;
    let waitingResponse = 0;

    for (const t of tickets) {
      if (isClosed(t)) continue;
      const sla = getSlaBadge(t.due_date);
      if (sla) {
        if (sla.overdue && overdueCount === 0) overdue += 1;
        if (!sla.overdue && (sla.color === 'red' || sla.color === 'orange')) slaToday += 1;
      }
      if (t.assigned_to === currentUserId) assignedToMe += 1;
      if (t.status_is_waiting_response) waitingResponse += 1;
    }

    return { overdue, slaToday, assignedToMe, waitingResponse, closed: closedCount };
  }, [tickets, currentUserId, overdueCount, closedCount]);

  // Разбивка «за сегодня» — заявки, созданные сегодня, по тем же категориям.
  const todayKpi: WorkspaceKpi = useMemo(() => {
    let overdue = 0;
    let slaToday = 0;
    let assignedToMe = 0;
    let waitingResponse = 0;
    let closed = 0;

    for (const t of tickets) {
      if (!isToday(t.created_at)) continue;
      if (isClosed(t)) {
        closed += 1;
        continue;
      }
      const sla = getSlaBadge(t.due_date);
      if (sla) {
        if (sla.overdue) overdue += 1;
        else if (sla.color === 'red' || sla.color === 'orange') slaToday += 1;
      }
      if (t.assigned_to === currentUserId) assignedToMe += 1;
      if (t.status_is_waiting_response) waitingResponse += 1;
    }

    return { overdue, slaToday, assignedToMe, waitingResponse, closed };
  }, [tickets, currentUserId]);

  return (
    <div className="grid grid-cols-1 gap-4 xl:grid-cols-[1fr_400px]">
      {/* Левая колонка: KPI + тулбар + таблица */}
      <div className="flex min-w-0 flex-col gap-4">
        <WorkspaceKpiCards kpi={kpi} today={todayKpi} />

        {/* Тулбар: поиск + режим отображения */}
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="relative w-full sm:max-w-sm">
            <Icon
              name="Search"
              size={16}
              className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground"
            />
            <Input
              value={searchQuery}
              onChange={(e) => onSearchChange(e.target.value)}
              placeholder="Поиск по заявкам..."
              className="pl-9"
            />
          </div>

          <div className="flex items-center gap-2">
            <span className="text-sm text-muted-foreground">Режим:</span>
            <div className="inline-flex items-center gap-1 rounded-xl border border-border bg-muted/40 p-1">
              <button
                type="button"
                title="Список"
                onClick={() => setGridMode(false)}
                className={`flex h-8 w-8 items-center justify-center rounded-lg transition-colors ${
                  !gridMode ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:bg-muted'
                }`}
              >
                <Icon name="List" size={16} />
              </button>
              <button
                type="button"
                title="Доска (скоро)"
                onClick={() => setGridMode(true)}
                className={`flex h-8 w-8 items-center justify-center rounded-lg transition-colors ${
                  gridMode ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:bg-muted'
                }`}
              >
                <Icon name="LayoutGrid" size={16} />
              </button>
            </div>
          </div>
        </div>

        {gridMode ? (
          <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-border bg-card py-20 text-muted-foreground">
            <Icon name="LayoutGrid" size={40} className="mb-3" />
            <p className="text-sm">Режим доски в разработке</p>
          </div>
        ) : (
          <WorkspaceTicketsTable
            tickets={pagedTickets}
            loading={loading}
            selectedTicketId={selectedTicket?.id ?? null}
            onSelectTicket={setSelectedTicket}
            page={localPage}
            totalPages={localTotalPages}
            totalTickets={tickets.length}
            onPageChange={(p) => setLocalPage(p)}
          />
        )}
      </div>

      {/* Правая колонка: детали заявки */}
      <div className="xl:sticky xl:top-4 xl:h-[calc(100vh-8rem)]">
        {selectedTicket ? (
          <WorkspaceDetailsPanel
            key={selectedTicket.id}
            ticketId={selectedTicket.id}
            onClose={() => setSelectedTicket(null)}
            onChanged={onReloadList}
          />
        ) : (
          <div className="flex h-full min-h-[300px] flex-col items-center justify-center rounded-2xl border border-dashed border-border bg-card text-muted-foreground">
            <Icon name="MousePointerClick" size={40} className="mb-3" />
            <p className="text-sm">Выберите заявку, чтобы увидеть детали</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default TicketsWorkspace;