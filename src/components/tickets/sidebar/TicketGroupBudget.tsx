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

interface Violation {
  violation_type: string;
  overdue_minutes: number;
  violated_at: string;
  group_name?: string;
}

interface SlaInfo {
  active_group: ActiveGroup | null;
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

interface Props {
  ticketId: number;
}

const TicketGroupBudget = ({ ticketId }: Props) => {
  const [slaInfo, setSlaInfo] = useState<SlaInfo | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadSlaInfo();
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

  const { active_group, violations } = slaInfo;
  const hasActiveGroup = active_group && active_group.budget_minutes;

  if (!hasActiveGroup && violations.length === 0) return null;

  return (
    <>
      {hasActiveGroup && (
        <div className="p-4">
          <h3 className="text-xs font-semibold mb-3 text-foreground uppercase tracking-wide flex items-center gap-2">
            <Icon name="Users" size={14} />
            Бюджет группы
          </h3>
          <GroupTimer group={active_group} />
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
