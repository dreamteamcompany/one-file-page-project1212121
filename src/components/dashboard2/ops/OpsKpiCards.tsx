import Icon from '@/components/ui/icon';
import { OpsKpi } from './useOpsDashboard';

interface OpsKpiCardsProps {
  kpi?: OpsKpi;
  loading: boolean;
}

interface CardConfig {
  key: keyof OpsKpi | string;
  label: string;
  icon: string;
  iconColor: string;
  iconBg: string;
  value: (k: OpsKpi) => string;
  sub: (k: OpsKpi) => { text: string; tone: 'up' | 'down' | 'neutral' };
}

const cards: CardConfig[] = [
  {
    key: 'active',
    label: 'Активные заявки',
    icon: 'Inbox',
    iconColor: 'text-indigo-500',
    iconBg: 'bg-indigo-50 dark:bg-indigo-500/10',
    value: (k) => String(k.active),
    sub: (k) => ({
      text: `${k.created_delta >= 0 ? '+' : ''}${k.created_delta} к прошлому`,
      tone: k.created_delta >= 0 ? 'up' : 'down',
    }),
  },
  {
    key: 'new_today',
    label: 'Новые за сегодня',
    icon: 'PlusCircle',
    iconColor: 'text-emerald-500',
    iconBg: 'bg-emerald-50 dark:bg-emerald-500/10',
    value: (k) => String(k.new_today),
    sub: (k) => ({ text: `${k.new_today} за сегодня`, tone: 'up' }),
  },
  {
    key: 'overdue_sla',
    label: 'Просроченные SLA',
    icon: 'AlarmClock',
    iconColor: 'text-red-500',
    iconBg: 'bg-red-50 dark:bg-red-500/10',
    value: (k) => String(k.overdue_sla),
    sub: (k) => ({ text: `${k.overdue_sla} нарушено`, tone: 'down' }),
  },
  {
    key: 'avg_response',
    label: 'Среднее время ответа',
    icon: 'MessageSquareReply',
    iconColor: 'text-amber-500',
    iconBg: 'bg-amber-50 dark:bg-amber-500/10',
    value: (k) => k.avg_response,
    sub: () => ({ text: 'за период', tone: 'neutral' }),
  },
  {
    key: 'avg_resolve',
    label: 'Среднее время решения',
    icon: 'CheckCircle2',
    iconColor: 'text-violet-500',
    iconBg: 'bg-violet-50 dark:bg-violet-500/10',
    value: (k) => k.avg_resolve,
    sub: () => ({ text: 'за период', tone: 'neutral' }),
  },
  {
    key: 'reopened',
    label: 'Повторно открытые',
    icon: 'RotateCcw',
    iconColor: 'text-orange-500',
    iconBg: 'bg-orange-50 dark:bg-orange-500/10',
    value: (k) => String(k.reopened),
    sub: (k) => ({ text: `${k.reopened} за период`, tone: 'neutral' }),
  },
];

const toneClass = (tone: 'up' | 'down' | 'neutral') =>
  tone === 'up' ? 'text-emerald-500' : tone === 'down' ? 'text-red-500' : 'text-muted-foreground';

const OpsKpiCards = ({ kpi, loading }: OpsKpiCardsProps) => {
  return (
    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3 sm:gap-4">
      {cards.map((c) => {
        const sub = kpi ? c.sub(kpi) : { text: '', tone: 'neutral' as const };
        return (
          <div
            key={c.key}
            className="bg-card border border-border rounded-2xl p-4 flex flex-col gap-3 shadow-sm"
          >
            <div className={`w-9 h-9 rounded-xl flex items-center justify-center ${c.iconBg}`}>
              <Icon name={c.icon} size={18} className={c.iconColor} />
            </div>
            <div>
              <div className="text-2xl font-bold text-foreground leading-none">
                {loading || !kpi ? '—' : c.value(kpi)}
              </div>
              <div className="text-xs text-muted-foreground mt-1.5">{c.label}</div>
            </div>
            <div className={`text-xs font-medium ${toneClass(sub.tone)}`}>
              {loading || !kpi ? '' : sub.text}
            </div>
          </div>
        );
      })}
    </div>
  );
};

export default OpsKpiCards;
