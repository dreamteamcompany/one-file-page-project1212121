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
      color: 'bg-blue-600 text-white border-blue-600',
    },
    {
      key: 'customer',
      label: 'Мои заявки',
      count: counters.by_role.customer,
      icon: 'User',
      color: 'bg-emerald-600 text-white border-emerald-600',
    },
    {
      key: 'watcher',
      label: 'Наблюдаю',
      count: counters.by_role.watcher,
      icon: 'Eye',
      color: 'bg-cyan-600 text-white border-cyan-600',
    },
    {
      key: 'approver',
      label: 'Согласовать',
      count: counters.by_role.approver,
      icon: 'CheckSquare',
      color: 'bg-amber-500 text-white border-amber-500',
    },
    {
      key: 'mentions',
      label: 'Упоминания',
      count: counters.by_event.mention,
      icon: 'AtSign',
      color: 'bg-purple-600 text-white border-purple-600',
    },
    {
      key: 'overdue',
      label: 'Просрочено',
      count: counters.overdue,
      icon: 'AlertTriangle',
      color: 'bg-red-600 text-white border-red-600',
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
            <span className="text-xs font-bold rounded-full bg-white/25 px-1.5 min-w-[20px] text-center">
              {item.count}
            </span>
          </Button>
        );
      })}
    </div>
  );
};

export default TicketCountersBar;