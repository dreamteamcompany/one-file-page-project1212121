import Icon from '@/components/ui/icon';
import { formatDate } from './TicketCommentsTypes';

export interface HistoryLog {
  id: number;
  ticket_id?: number;
  user_id?: number;
  user_name?: string;
  user_full_name?: string;
  field_name: string;
  old_value?: string;
  new_value?: string;
  created_at: string;
}

interface TicketEventItemProps {
  log: HistoryLog;
}

const EVENT_CONFIG: Record<string, {
  icon: string;
  color: string;
  borderColor: string;
  bgColor: string;
  label: (log: HistoryLog) => string;
  detail?: (log: HistoryLog) => string | null;
}> = {
  status_id: {
    icon: 'RefreshCw',
    color: 'text-blue-400',
    borderColor: 'border-blue-500/30',
    bgColor: 'bg-blue-500/10',
    label: () => 'Статус изменён',
    detail: (log) => log.old_value && log.new_value
      ? `${log.old_value} → ${log.new_value}`
      : log.new_value || null,
  },
  assigned_to: {
    icon: 'UserCheck',
    color: 'text-emerald-400',
    borderColor: 'border-emerald-500/30',
    bgColor: 'bg-emerald-500/10',
    label: (log) => log.new_value ? 'Назначен исполнитель' : 'Исполнитель снят',
    detail: (log) => log.new_value || null,
  },
  executor_group_id: {
    icon: 'Users',
    color: 'text-cyan-400',
    borderColor: 'border-cyan-500/30',
    bgColor: 'bg-cyan-500/10',
    label: (log) => log.new_value ? 'Назначена группа' : 'Группа снята',
    detail: (log) => log.new_value || null,
  },
  priority_id: {
    icon: 'Flag',
    color: 'text-orange-400',
    borderColor: 'border-orange-500/30',
    bgColor: 'bg-orange-500/10',
    label: () => 'Приоритет изменён',
    detail: (log) => log.old_value && log.new_value
      ? `${log.old_value} → ${log.new_value}`
      : log.new_value || null,
  },
  due_date: {
    icon: 'Calendar',
    color: 'text-violet-400',
    borderColor: 'border-violet-500/30',
    bgColor: 'bg-violet-500/10',
    label: (log) => log.new_value ? 'Дедлайн установлен' : 'Дедлайн удалён',
    detail: (log) => log.new_value || null,
  },
  reopen_reason: {
    icon: 'RotateCcw',
    color: 'text-amber-400',
    borderColor: 'border-amber-500/30',
    bgColor: 'bg-amber-500/10',
    label: () => 'Заявка открыта повторно',
    detail: (log) => log.new_value || null,
  },
  title: {
    icon: 'Edit',
    color: 'text-muted-foreground',
    borderColor: 'border-border',
    bgColor: 'bg-muted/30',
    label: () => 'Заголовок изменён',
    detail: () => null,
  },
  description: {
    icon: 'FileText',
    color: 'text-muted-foreground',
    borderColor: 'border-border',
    bgColor: 'bg-muted/30',
    label: () => 'Описание изменено',
    detail: () => null,
  },
};

const DEFAULT_CONFIG = {
  icon: 'Activity',
  color: 'text-muted-foreground',
  borderColor: 'border-border',
  bgColor: 'bg-muted/30',
  label: (log: HistoryLog) => `Изменено: ${log.field_name}`,
  detail: () => null as string | null,
};

const TicketEventItem = ({ log }: TicketEventItemProps) => {
  const config = EVENT_CONFIG[log.field_name] ?? DEFAULT_CONFIG;
  const label = config.label(log);
  const detail = config.detail ? config.detail(log) : null;
  const actor = log.user_full_name || log.user_name;

  return (
    <div className="flex items-center gap-3 my-3">
      <div className={`flex-1 h-px ${config.borderColor.replace('border-', 'bg-').replace('/30', '/20')}`} />
      <div className={`flex flex-col items-center gap-1 px-4 py-2 rounded-xl border ${config.bgColor} ${config.borderColor} max-w-xs text-center`}>
        <div className={`flex items-center gap-1.5 font-semibold text-[11px] uppercase tracking-wide ${config.color}`}>
          <Icon name={config.icon as Parameters<typeof Icon>[0]['name']} size={12} />
          {label}
        </div>
        {detail && (
          <p className="text-xs text-muted-foreground leading-relaxed">{detail}</p>
        )}
        <p className="text-[11px] text-muted-foreground/60">
          {formatDate(log.created_at)}{actor ? ` · ${actor}` : ''}
        </p>
      </div>
      <div className={`flex-1 h-px ${config.borderColor.replace('border-', 'bg-').replace('/30', '/20')}`} />
    </div>
  );
};

export default TicketEventItem;
