import { useEffect, useState } from 'react';
import { apiFetch, getApiUrl } from '@/utils/api';
import Icon from '@/components/ui/icon';
import { Badge } from '@/components/ui/badge';

interface ActiveGroup {
  executor_group_id: number;
  group_name: string;
  assigned_at: string;
  budget_minutes: number | null;
  elapsed_minutes: number;
}

interface MyGroup {
  executor_group_id: number;
  group_name: string;
  resolution_minutes: number | null;
  response_minutes: number | null;
  elapsed_minutes: number;
  is_active: boolean;
}

interface ChainItem {
  executor_group_id: number;
  group_name: string;
  resolution_minutes: number | null;
  response_minutes: number | null;
  status: 'done' | 'active' | 'pending';
  actual_minutes: number | null;
  sort_order: number;
}

interface Violation {
  violation_type: string;
  overdue_minutes: number;
  violated_at: string;
  group_name?: string;
}

interface TicketRef {
  due_date?: string | null;
  response_due_date?: string | null;
}

interface SlaInfo {
  ticket?: TicketRef;
  active_group: ActiveGroup | null;
  my_group: MyGroup | null;
  group_chain: ChainItem[];
  violations: Violation[];
  has_violations: boolean;
}

const VIOLATION_LABELS: Record<string, string> = {
  group_resolution: 'Бюджет группы (решение)',
  group_response: 'Бюджет группы (реакция)',
  global_resolution: 'Общий SLA (решение)',
  global_response: 'Общий SLA (реакция)',
};

const formatMinutes = (minutes: number) => {
  const h = Math.floor(Math.abs(minutes) / 60);
  const m = Math.round(Math.abs(minutes) % 60);
  if (h === 0) return `${m} мин`;
  if (m === 0) return `${h} ч`;
  return `${h} ч ${m} мин`;
};

const formatDateTime = (iso: string) => {
  try {
    const d = new Date(iso);
    return d.toLocaleString('ru-RU', {
      day: '2-digit',
      month: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
    });
  } catch {
    return iso;
  }
};

interface Props {
  ticketId: number;
}

const TicketGroupBudget = ({ ticketId }: Props) => {
  const [slaInfo, setSlaInfo] = useState<SlaInfo | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadSlaInfo();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ticketId]);

  const loadSlaInfo = async () => {
    try {
      const res = await apiFetch(
        `${getApiUrl('sla-analytics')}?endpoint=sla-analytics&action=ticket_sla_info&ticket_id=${ticketId}`
      );
      if (res.ok) {
        const data = await res.json();
        setSlaInfo(data);
      }
    } catch {
      setSlaInfo(null);
    } finally {
      setLoading(false);
    }
  };

  if (loading) return null;
  if (!slaInfo) return null;

  const { my_group, active_group, group_chain, violations, ticket } = slaInfo;
  const hasMy = my_group && my_group.resolution_minutes;
  const hasActiveOnly = !hasMy && active_group && active_group.budget_minutes;
  const hasChain = group_chain && group_chain.length > 0;

  if (!hasMy && !hasActiveOnly && !hasChain && violations.length === 0) return null;

  const totalDeadline = ticket?.due_date || null;

  return (
    <>
      {hasMy && (
        <div className="p-4">
          <h3 className="text-xs font-semibold mb-3 text-foreground uppercase tracking-wide flex items-center gap-2">
            <Icon name="UserCheck" size={14} className="text-primary" />
            Твоё время
          </h3>
          <MyTimer my={my_group!} />
          {totalDeadline && (
            <p className="text-[11px] text-muted-foreground mt-2 flex items-center gap-1">
              <Icon name="Clock" size={11} />
              Общий SLA по заявке: до {formatDateTime(totalDeadline)}
            </p>
          )}
        </div>
      )}

      {hasActiveOnly && (
        <div className="p-4">
          <h3 className="text-xs font-semibold mb-3 text-foreground uppercase tracking-wide flex items-center gap-2">
            <Icon name="Users" size={14} />
            Бюджет текущей группы
          </h3>
          <GroupTimer group={active_group!} />
        </div>
      )}

      {hasChain && (
        <div className="p-4">
          <h3 className="text-xs font-semibold mb-3 text-foreground uppercase tracking-wide flex items-center gap-2">
            <Icon name="ListChecks" size={14} />
            Этапы заявки
          </h3>
          <div className="space-y-1.5">
            {group_chain.map((item, i) => (
              <ChainRow
                key={item.executor_group_id}
                item={item}
                index={i}
                isMine={my_group?.executor_group_id === item.executor_group_id}
              />
            ))}
          </div>
        </div>
      )}

      {violations.length > 0 && (
        <div className="p-4">
          <h3 className="text-xs font-semibold mb-3 text-foreground uppercase tracking-wide flex items-center gap-2">
            <Icon name="AlertTriangle" size={14} className="text-red-500" />
            Нарушения SLA
          </h3>
          <div className="space-y-2">
            {violations.map((v, i) => (
              <ViolationItem key={i} violation={v} />
            ))}
          </div>
        </div>
      )}
    </>
  );
};

const MyTimer = ({ my }: { my: MyGroup }) => {
  const budget = my.resolution_minutes || 0;
  const remaining = budget - my.elapsed_minutes;
  const isOverdue = budget > 0 && remaining < 0;
  const percentage = budget ? Math.min(100, (my.elapsed_minutes / budget) * 100) : 0;

  const getColor = () => {
    if (isOverdue) return '#ef4444';
    if (percentage > 80) return '#f97316';
    if (percentage > 60) return '#eab308';
    return '#22c55e';
  };
  const color = getColor();

  return (
    <div className="space-y-3 p-3 rounded-lg border-2" style={{ borderColor: `${color}55`, backgroundColor: `${color}08` }}>
      <div className="flex items-center gap-3">
        <div
          className="w-12 h-12 rounded-full flex items-center justify-center flex-shrink-0"
          style={{ backgroundColor: `${color}20` }}
        >
          <Icon
            name={isOverdue ? 'AlertCircle' : 'Clock'}
            size={24}
            style={{ color }}
          />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-xs text-muted-foreground">
            Группа: <span className="font-medium text-foreground">{my.group_name}</span>
            {my.is_active && (
              <span className="ml-1.5 inline-flex items-center gap-1 text-[10px] text-green-500">
                <span className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse" />
                идёт
              </span>
            )}
          </p>
          <p className="font-bold text-lg leading-tight" style={{ color }}>
            {isOverdue
              ? `Просрочено на ${formatMinutes(Math.abs(remaining))}`
              : `Осталось ${formatMinutes(remaining)}`}
          </p>
        </div>
        {isOverdue && (
          <Badge
            variant="secondary"
            className="flex-shrink-0"
            style={{ backgroundColor: '#ef4444', color: 'white', fontSize: '10px' }}
          >
            Просрочено
          </Badge>
        )}
      </div>
      <div className="w-full h-2 bg-muted rounded-full overflow-hidden">
        <div
          className="h-full rounded-full transition-all duration-500"
          style={{ width: `${Math.min(percentage, 100)}%`, backgroundColor: color }}
        />
      </div>
      <p className="text-[11px] text-muted-foreground">
        Использовано {formatMinutes(my.elapsed_minutes)} из {formatMinutes(budget)}
      </p>
    </div>
  );
};

const GroupTimer = ({ group }: { group: ActiveGroup }) => {
  const remaining = (group.budget_minutes || 0) - group.elapsed_minutes;
  const isOverdue = remaining < 0;
  const percentage = group.budget_minutes
    ? Math.min(100, (group.elapsed_minutes / group.budget_minutes) * 100)
    : 0;

  const getColor = () => {
    if (isOverdue) return '#ef4444';
    if (percentage > 80) return '#f97316';
    if (percentage > 60) return '#eab308';
    return '#22c55e';
  };

  const color = getColor();

  return (
    <div className="space-y-2">
      <div className="flex items-center gap-2">
        <div
          className="w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0"
          style={{ backgroundColor: `${color}20` }}
        >
          <Icon
            name={isOverdue ? 'AlertCircle' : 'Clock'}
            size={16}
            style={{ color }}
          />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-xs text-muted-foreground">{group.group_name}</p>
          <p className="font-semibold text-sm" style={{ color }}>
            {isOverdue
              ? `Просрочено на ${formatMinutes(Math.abs(remaining))}`
              : `Осталось ${formatMinutes(remaining)}`}
          </p>
        </div>
        {isOverdue && (
          <Badge
            variant="secondary"
            className="flex-shrink-0"
            style={{
              backgroundColor: '#ef4444',
              color: 'white',
              fontSize: '10px',
              padding: '2px 6px',
            }}
          >
            Просрочено
          </Badge>
        )}
      </div>
      <div className="w-full h-1.5 bg-muted rounded-full overflow-hidden">
        <div
          className="h-full rounded-full transition-all duration-500"
          style={{
            width: `${Math.min(percentage, 100)}%`,
            backgroundColor: color,
          }}
        />
      </div>
      <p className="text-[10px] text-muted-foreground">
        Использовано {formatMinutes(group.elapsed_minutes)} из{' '}
        {formatMinutes(group.budget_minutes || 0)}
      </p>
    </div>
  );
};

const ChainRow = ({
  item,
  index,
  isMine,
}: {
  item: ChainItem;
  index: number;
  isMine: boolean;
}) => {
  const statusConf =
    item.status === 'done'
      ? { color: '#22c55e', icon: 'CheckCircle2' as const, label: 'Пройдено' }
      : item.status === 'active'
        ? { color: '#3b82f6', icon: 'Loader2' as const, label: 'Сейчас' }
        : { color: '#94a3b8', icon: 'Circle' as const, label: 'Ожидает' };

  const opacity = item.status === 'pending' ? 'opacity-60' : '';
  const ring = isMine ? 'ring-2 ring-primary/40' : '';
  const bg = item.status === 'active' ? `${statusConf.color}10` : 'transparent';

  return (
    <div
      className={`flex items-center gap-2 p-2 rounded-md border ${opacity} ${ring}`}
      style={{
        borderColor: item.status === 'active' ? `${statusConf.color}55` : 'hsl(var(--border))',
        backgroundColor: bg,
      }}
    >
      <div className="flex items-center justify-center w-5 h-5 rounded-full text-[10px] font-bold text-white flex-shrink-0"
           style={{ backgroundColor: statusConf.color }}>
        {index + 1}
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-1.5">
          <p className="text-xs font-medium truncate">{item.group_name}</p>
          {isMine && (
            <span className="text-[9px] px-1 rounded bg-primary/20 text-primary font-semibold uppercase">
              Ты
            </span>
          )}
        </div>
        <p className="text-[10px] text-muted-foreground">
          {item.resolution_minutes ? `Бюджет: ${formatMinutes(item.resolution_minutes)}` : 'Без бюджета'}
          {item.actual_minutes != null && ` · Факт: ${formatMinutes(item.actual_minutes)}`}
        </p>
      </div>
      <span
        className="text-[10px] font-semibold whitespace-nowrap"
        style={{ color: statusConf.color }}
      >
        {statusConf.label}
      </span>
    </div>
  );
};

const ViolationItem = ({ violation }: { violation: Violation }) => {
  return (
    <div className="flex items-start gap-2 p-2 rounded bg-red-500/5 border border-red-500/10">
      <Icon name="XCircle" size={14} className="text-red-500 mt-0.5 flex-shrink-0" />
      <div className="flex-1 min-w-0">
        <p className="text-xs font-medium text-red-500">
          {VIOLATION_LABELS[violation.violation_type] || violation.violation_type}
        </p>
        <p className="text-[10px] text-muted-foreground">
          Просрочено на {formatMinutes(violation.overdue_minutes)}
          {violation.group_name && ` (${violation.group_name})`}
        </p>
      </div>
    </div>
  );
};

export default TicketGroupBudget;
