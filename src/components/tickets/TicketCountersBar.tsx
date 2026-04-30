/**
 * Бейджи счётчиков непрочитанного по ролям и типам.
 * Показывается над списком заявок. Клик по бейджу — фильтрация (опционально).
 */
import { Button } from '@/components/ui/button';
import Icon from '@/components/ui/icon';
import { useTicketCounters } from '@/hooks/useTicketCounters';

interface TicketCountersBarProps {
  onSelectRole?: (role: 'assignee' | 'customer' | 'watcher' | 'approver' | 'mentions' | 'overdue' | null) => void;
  activeRole?: string | null;
}

const TicketCountersBar = ({ onSelectRole, activeRole }: TicketCountersBarProps) => {
  const { counters } = useTicketCounters();

  const items: Array<{
    key: 'assignee' | 'customer' | 'watcher' | 'approver' | 'mentions' | 'overdue';
    label: string;
    count: number;
    icon: string;
    color: string;
  }> = [
    {
      key: 'assignee',
      label: 'Назначено мне',
      count: counters.by_role.assignee,
      icon: 'UserCheck',
      color: 'bg-blue-500/10 text-blue-700 dark:text-blue-300 border-blue-500/30',
    },
    {
      key: 'customer',
      label: 'Мои заявки',
      count: counters.by_role.customer,
      icon: 'User',
      color: 'bg-green-500/10 text-green-700 dark:text-green-300 border-green-500/30',
    },
    {
      key: 'watcher',
      label: 'Наблюдаю',
      count: counters.by_role.watcher,
      icon: 'Eye',
      color: 'bg-cyan-500/10 text-cyan-700 dark:text-cyan-300 border-cyan-500/30',
    },
    {
      key: 'approver',
      label: 'Согласовать',
      count: counters.by_role.approver,
      icon: 'CheckSquare',
      color: 'bg-amber-500/10 text-amber-700 dark:text-amber-300 border-amber-500/30',
    },
    {
      key: 'mentions',
      label: 'Упоминания',
      count: counters.by_event.mention,
      icon: 'AtSign',
      color: 'bg-purple-500/10 text-purple-700 dark:text-purple-300 border-purple-500/30',
    },
    {
      key: 'overdue',
      label: 'Просрочено',
      count: counters.overdue,
      icon: 'AlertTriangle',
      color: 'bg-red-500/10 text-red-700 dark:text-red-300 border-red-500/30',
    },
  ];

  const visible = items.filter((i) => i.count > 0);
  if (visible.length === 0) return null;

  return (
    <div className="flex flex-wrap items-center gap-2 mb-3">
      {visible.map((item) => {
        const isActive = activeRole === item.key;
        return (
          <Button
            key={item.key}
            variant="outline"
            size="sm"
            onClick={() => onSelectRole?.(isActive ? null : item.key)}
            className={`h-8 px-3 gap-2 border ${item.color} ${
              isActive ? 'ring-2 ring-offset-1 ring-current' : ''
            }`}
          >
            <Icon name={item.icon} size={14} />
            <span className="text-xs font-medium">{item.label}</span>
            <span className="text-xs font-bold rounded-full bg-white/40 dark:bg-black/30 px-1.5 min-w-[20px] text-center">
              {item.count}
            </span>
          </Button>
        );
      })}
    </div>
  );
};

export default TicketCountersBar;
