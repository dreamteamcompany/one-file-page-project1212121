/**
 * Ряд из 5 KPI-карточек нового интерфейса заявок.
 * Числа считаются из реальных данных (загруженные заявки + серверные счётчики).
 */
import Icon from '@/components/ui/icon';

export interface WorkspaceKpi {
  overdue: number;
  slaToday: number;
  assignedToMe: number;
  waitingResponse: number;
  closed: number;
}

interface WorkspaceKpiCardsProps {
  kpi: WorkspaceKpi;
}

interface CardConfig {
  key: keyof WorkspaceKpi;
  label: string;
  icon: string;
  color: string;
}

const CARDS: CardConfig[] = [
  { key: 'overdue', label: 'Просрочено', icon: 'CircleAlert', color: 'text-red-500' },
  { key: 'slaToday', label: 'SLA сегодня', icon: 'Clock', color: 'text-orange-500' },
  { key: 'assignedToMe', label: 'Назначено мне', icon: 'UserRound', color: 'text-blue-500' },
  { key: 'waitingResponse', label: 'Ожидают ответа', icon: 'MessageSquare', color: 'text-violet-500' },
  { key: 'closed', label: 'Закрыто', icon: 'CircleCheck', color: 'text-green-500' },
];

const WorkspaceKpiCards = ({ kpi }: WorkspaceKpiCardsProps) => {
  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
      {CARDS.map((card) => (
        <div
          key={card.key}
          className="relative rounded-2xl border border-border bg-card p-4 shadow-sm"
        >
          <div className="flex items-start justify-between">
            <span className="text-sm text-muted-foreground">{card.label}</span>
            <Icon name={card.icon} size={18} className={card.color} />
          </div>
          <div className="mt-2 text-3xl font-bold text-foreground">
            {kpi[card.key]}
          </div>
        </div>
      ))}
    </div>
  );
};

export default WorkspaceKpiCards;
