import Icon from '@/components/ui/icon';
import { formatDateTimeMSK } from '@/utils/dateFormat';

interface HistoryLog {
  id: number;
  field_name?: string;
  old_value?: string;
  new_value?: string;
  user_name?: string;
  user_full_name?: string;
  created_at: string;
}

interface TicketHistoryProps {
  logs: HistoryLog[];
  loading?: boolean;
}

const FIELD_LABELS: Record<string, string> = {
  status_id: 'Статус',
  priority_id: 'Приоритет',
  assigned_to: 'Исполнитель',
  executor_group_id: 'Группа исполнителей',
  title: 'Заголовок',
  description: 'Описание',
  due_date: 'Дедлайн',
  category: 'Категория',
  comment: 'Комментарий',
  reopen_reason: 'Причина повторного открытия',
  content: 'Содержание',
  watchers: 'Наблюдатели',
};

const getIcon = (fieldName?: string): string => {
  switch (fieldName) {
    case 'status_id': return 'RefreshCw';
    case 'priority_id': return 'Flag';
    case 'assigned_to': return 'UserCheck';
    case 'executor_group_id': return 'Users';
    case 'comment': return 'MessageSquare';
    case 'reopen_reason': return 'RotateCcw';
    case 'due_date': return 'Calendar';
    case 'title': return 'FileText';
    case 'description':
    case 'content': return 'AlignLeft';
    case 'watcher_added':
    case 'watcher_removed': return 'Eye';
    default: return 'Activity';
  }
};

const getColor = (fieldName?: string): string => {
  switch (fieldName) {
    case 'status_id': return 'text-orange-400';
    case 'priority_id': return 'text-yellow-400';
    case 'assigned_to': return 'text-green-400';
    case 'executor_group_id': return 'text-cyan-400';
    case 'comment': return 'text-blue-400';
    case 'reopen_reason': return 'text-amber-400';
    case 'due_date': return 'text-purple-400';
    case 'watcher_added': return 'text-teal-400';
    case 'watcher_removed': return 'text-rose-400';
    default: return 'text-muted-foreground';
  }
};

const getActionText = (log: HistoryLog): string => {
  const label = FIELD_LABELS[log.field_name || ''] || log.field_name || 'поле';

  if (log.field_name === 'comment') {
    const text = log.new_value || '';
    const preview = text.startsWith('Добавлен комментарий: ')
      ? text.slice('Добавлен комментарий: '.length)
      : text;
    return `оставил комментарий: ${preview.slice(0, 80)}${preview.length > 80 ? '…' : ''}`;
  }

  if (log.field_name === 'reopen_reason') {
    return `повторно открыл заявку: ${log.new_value || ''}`;
  }

  if (log.field_name === 'watcher_added') {
    return `добавил наблюдателя: ${log.new_value || ''}`;
  }

  if (log.field_name === 'watcher_removed') {
    return `убрал наблюдателя: ${log.old_value || ''}`;
  }

  if (log.old_value && log.new_value) {
    return `изменил ${label}: ${log.old_value} → ${log.new_value}`;
  }
  if (!log.old_value && log.new_value) {
    return `установил ${label}: ${log.new_value}`;
  }
  if (log.old_value && !log.new_value) {
    return `сбросил ${label} (было: ${log.old_value})`;
  }
  return `изменил ${label}`;
};

const TicketHistory = ({ logs, loading }: TicketHistoryProps) => {
  const formatDateTime = (dateStr: string) => formatDateTimeMSK(dateStr);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-8">
        <Icon name="Loader2" size={24} className="animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!logs || logs.length === 0) {
    return (
      <div className="text-center py-8 text-muted-foreground">
        <Icon name="History" size={48} className="mx-auto mb-2 opacity-30" />
        <p>История изменений пока пуста</p>
      </div>
    );
  }

  return (
    <div className="space-y-1">
      {logs.map((log, index) => {
        const author = log.user_full_name || log.user_name || 'Система';
        const actionText = getActionText(log);
        const iconName = getIcon(log.field_name);
        const color = getColor(log.field_name);

        return (
          <div key={log.id} className="flex gap-3 relative py-2">
            {index < logs.length - 1 && (
              <div className="absolute left-4 top-9 bottom-0 w-px bg-border/50" />
            )}

            <div className={`flex-shrink-0 w-8 h-8 rounded-full bg-muted border border-border flex items-center justify-center z-10 ${color}`}>
              <Icon name={iconName} size={13} />
            </div>

            <div className="flex-1 flex items-start justify-between gap-4 min-w-0">
              <p className="text-sm leading-relaxed min-w-0">
                <span className="font-medium text-foreground">{author}</span>
                {' '}
                <span className="text-muted-foreground break-words">{actionText}</span>
              </p>
              <time className="text-xs text-muted-foreground whitespace-nowrap flex-shrink-0 mt-0.5">
                {formatDateTime(log.created_at)}
              </time>
            </div>
          </div>
        );
      })}
    </div>
  );
};

export default TicketHistory;