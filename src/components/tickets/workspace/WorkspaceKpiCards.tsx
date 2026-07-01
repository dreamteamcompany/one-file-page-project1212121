/**
 * Ряд из 5 KPI-карточек нового интерфейса заявок.
 * Числа считаются из реальных данных (загруженные заявки + серверные счётчики).
 * Дизайн по эталону: цветное число, иконка в пастельной плашке, подпись «+N за сегодня».
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
  today: WorkspaceKpi;
}

interface CardConfig {
  key: keyof WorkspaceKpi;
  label: string;
  icon: string;
  numberColor: string;
  iconColor: string;
  iconBg: string;
}

const CARDS: CardConfig[] = [
  { key: 'overdue', label: 'Просрочено', icon: 'CircleAlert', numberColor: 'text-red-500', iconColor: 'text-red-500', iconBg: 'bg-red-100 dark:bg-red-950/40' },
  { key: 'slaToday', label: 'SLA сегодня', icon: 'Clock', numberColor: 'text-orange-500', iconColor: 'text-orange-500', iconBg: 'bg-orange-100 dark:bg-orange-950/40' },
  { key: 'assignedToMe', label: 'Назначено мне', icon: 'UserRound', numberColor: 'text-blue-500', iconColor: 'text-blue-500', iconBg: 'bg-blue-100 dark:bg-blue-950/40' },
  { key: 'waitingResponse', label: 'Ожидают ответа', icon: 'MessageSquare', numberColor: 'text-violet-500', iconColor: 'text-violet-500', iconBg: 'bg-violet-100 dark:bg-violet-950/40' },
  { key: 'closed', label: 'Закрыто', icon: 'CircleCheck', numberColor: 'text-green-500', iconColor: 'text-green-500', iconBg: 'bg-green-100 dark:bg-green-950/40' },
];

const WorkspaceKpiCards = ({ kpi, today }: WorkspaceKpiCardsProps) => {
  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
      {CARDS.map((card) => (
        <div
          key={card.key}
          className="relative flex flex-col gap-3 rounded-2xl border border-border bg-card p-4 shadow-sm"
        >
          <div className="flex items-start justify-between">
            <span className="text-sm text-muted-foreground">{card.label}</span>
            <span className={`flex h-8 w-8 items-center justify-center rounded-full ${card.iconBg}`}>
              <Icon name={card.icon} size={18} className={card.iconColor} />
            </span>
          </div>
          <div>
            <div className={`text-3xl font-bold ${card.numberColor}`}>
              {kpi[card.key]}
            </div>
            <div className={`mt-1 text-xs font-medium ${card.numberColor}`}>
              +{today[card.key]} за сегодня
            </div>
          </div>
        </div>
      ))}
    </div>
  );
};

export default WorkspaceKpiCards;