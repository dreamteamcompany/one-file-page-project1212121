import { Card, CardContent } from '@/components/ui/card';
import Icon from '@/components/ui/icon';
import type { DashboardData } from '@/pages/Dashboard2';

interface Props {
  data: DashboardData;
}

const getComplianceColor = (percent: number) => {
  if (percent >= 95) return '#22c55e';
  if (percent >= 80) return '#eab308';
  return '#ef4444';
};

const STATS_CONFIG = [
  {
    key: 'compliance',
    title: 'Соблюдение SLA',
    icon: 'ShieldCheck',
    getValue: (d: DashboardData) => `${d.sla_compliance_percent}%`,
    getColor: (d: DashboardData) => getComplianceColor(d.sla_compliance_percent),
  },
  {
    key: 'violations',
    title: 'Всего нарушений',
    icon: 'ShieldAlert',
    getValue: (d: DashboardData) => d.total_violations.toString(),
    getColor: () => '#ef4444',
  },
  {
    key: 'with_sla',
    title: 'Заявки с SLA',
    icon: 'Ticket',
    getValue: (d: DashboardData) => d.total_tickets_with_sla.toString(),
    getColor: () => '#3b82f6',
  },
  {
    key: 'violated',
    title: 'Нарушено заявок',
    icon: 'AlertTriangle',
    getValue: (d: DashboardData) => d.violated_tickets.toString(),
    getColor: () => '#f97316',
  },
] as const;

const SlaStatsCards = ({ data }: Props) => {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
      {STATS_CONFIG.map((cfg) => {
        const color = cfg.getColor(data);
        return (
          <Card key={cfg.key} className="bg-card/50 border-white/10">
            <CardContent className="p-4 flex items-center gap-4">
              <div
                className="w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0"
                style={{ backgroundColor: `${color}20` }}
              >
                <Icon name={cfg.icon} size={24} style={{ color }} />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">{cfg.title}</p>
                <p className="text-2xl font-bold" style={{ color }}>
                  {cfg.getValue(data)}
                </p>
              </div>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
};

export default SlaStatsCards;
