import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { apiFetch, getApiUrl } from '@/utils/api';
import PageLayout from '@/components/layout/PageLayout';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import Icon from '@/components/ui/icon';
import { Progress } from '@/components/ui/progress';

interface ViolationByType {
  violation_type: string;
  count: number;
  avg_overdue_minutes: number;
  max_overdue_minutes: number;
}

interface ViolationByGroup {
  executor_group_id: number;
  group_name: string;
  violation_count: number;
  avg_overdue_minutes: number;
  max_overdue_minutes: number;
}

interface GroupPerformance {
  executor_group_id: number;
  group_name: string;
  total_assignments: number;
  avg_time_minutes: number;
  overdue_count: number;
  overdue_percent: number;
}

interface DashboardData {
  total_violations: number;
  sla_compliance_percent: number;
  total_tickets_with_sla: number;
  violated_tickets: number;
  by_type: ViolationByType[];
  by_group: ViolationByGroup[];
  group_performance: GroupPerformance[];
}

const VIOLATION_LABELS: Record<string, string> = {
  group_resolution: 'Бюджет группы (решение)',
  group_response: 'Бюджет группы (реакция)',
  global_resolution: 'Общий SLA (решение)',
  global_response: 'Общий SLA (реакция)',
};

const formatMinutes = (minutes: number) => {
  if (!minutes) return '0 мин';
  const h = Math.floor(Math.abs(minutes) / 60);
  const m = Math.round(Math.abs(minutes) % 60);
  if (h === 0) return `${m} мин`;
  if (m === 0) return `${h} ч`;
  return `${h} ч ${m} мин`;
};

const SlaAnalytics = () => {
  const navigate = useNavigate();
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadDashboard();
  }, []);

  const loadDashboard = async () => {
    try {
      const res = await apiFetch(
        `${getApiUrl('sla-analytics')}?endpoint=sla-analytics&action=dashboard`
      );
      if (res.ok) {
        setData(await res.json());
      }
    } catch {
      setData(null);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <PageLayout>
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary" />
        </div>
      </PageLayout>
    );
  }

  if (!data) {
    return (
      <PageLayout>
        <p className="text-muted-foreground">Не удалось загрузить аналитику</p>
      </PageLayout>
    );
  }

  const complianceColor =
    data.sla_compliance_percent >= 95
      ? '#22c55e'
      : data.sla_compliance_percent >= 80
        ? '#eab308'
        : '#ef4444';

  return (
    <PageLayout>
      <div className="flex items-center gap-3 mb-6">
        <button
          onClick={() => navigate('/settings')}
          className="p-2 hover:bg-white/5 rounded-lg transition-colors"
        >
          <Icon name="ArrowLeft" size={20} />
        </button>
        <div>
          <h1 className="text-2xl md:text-3xl font-bold">Аналитика SLA</h1>
          <p className="text-muted-foreground text-sm">
            Статистика нарушений и эффективность групп
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        <StatCard
          title="Соблюдение SLA"
          value={`${data.sla_compliance_percent}%`}
          icon="ShieldCheck"
          color={complianceColor}
        />
        <StatCard
          title="Всего нарушений"
          value={data.total_violations.toString()}
          icon="ShieldAlert"
          color="#ef4444"
        />
        <StatCard
          title="Заявки с SLA"
          value={data.total_tickets_with_sla.toString()}
          icon="Ticket"
          color="#3b82f6"
        />
        <StatCard
          title="Нарушено заявок"
          value={data.violated_tickets.toString()}
          icon="AlertTriangle"
          color="#f97316"
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
        <Card className="bg-card/50 border-white/10">
          <CardContent className="p-6">
            <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
              <Icon name="BarChart3" size={20} className="text-primary" />
              Нарушения по типу
            </h3>
            {data.by_type.length === 0 ? (
              <EmptyState text="Нарушений не зафиксировано" />
            ) : (
              <div className="space-y-4">
                {data.by_type.map((item) => (
                  <div key={item.violation_type} className="space-y-1">
                    <div className="flex justify-between text-sm">
                      <span>
                        {VIOLATION_LABELS[item.violation_type] ||
                          item.violation_type}
                      </span>
                      <span className="font-semibold text-red-500">
                        {item.count}
                      </span>
                    </div>
                    <div className="flex items-center gap-3 text-xs text-muted-foreground">
                      <span>
                        Среднее: {formatMinutes(item.avg_overdue_minutes)}
                      </span>
                      <span>
                        Макс: {formatMinutes(item.max_overdue_minutes)}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        <Card className="bg-card/50 border-white/10">
          <CardContent className="p-6">
            <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
              <Icon name="Users" size={20} className="text-primary" />
              Нарушения по группам
            </h3>
            {data.by_group.length === 0 ? (
              <EmptyState text="Нарушений по группам нет" />
            ) : (
              <div className="space-y-4">
                {data.by_group.map((item) => (
                  <div key={item.executor_group_id} className="space-y-1">
                    <div className="flex justify-between text-sm">
                      <span className="font-medium">{item.group_name}</span>
                      <span className="font-semibold text-red-500">
                        {item.violation_count}
                      </span>
                    </div>
                    <div className="flex items-center gap-3 text-xs text-muted-foreground">
                      <span>
                        Среднее: {formatMinutes(item.avg_overdue_minutes)}
                      </span>
                      <span>
                        Макс: {formatMinutes(item.max_overdue_minutes)}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <Card className="bg-card/50 border-white/10">
        <CardContent className="p-6">
          <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
            <Icon name="Activity" size={20} className="text-primary" />
            Эффективность групп
          </h3>
          {data.group_performance.length === 0 ? (
            <EmptyState text="Данных пока нет — группы ещё не обрабатывали заявки" />
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {data.group_performance.map((group) => (
                <GroupPerformanceCard key={group.executor_group_id} group={group} />
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </PageLayout>
  );
};

const StatCard = ({
  title,
  value,
  icon,
  color,
}: {
  title: string;
  value: string;
  icon: string;
  color: string;
}) => (
  <Card className="bg-card/50 border-white/10">
    <CardContent className="p-4 flex items-center gap-4">
      <div
        className="w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0"
        style={{ backgroundColor: `${color}15` }}
      >
        <Icon name={icon} size={24} style={{ color }} />
      </div>
      <div>
        <p className="text-xs text-muted-foreground">{title}</p>
        <p className="text-2xl font-bold" style={{ color }}>
          {value}
        </p>
      </div>
    </CardContent>
  </Card>
);

const GroupPerformanceCard = ({ group }: { group: GroupPerformance }) => {
  const compliancePercent = 100 - (group.overdue_percent || 0);
  const color =
    compliancePercent >= 95
      ? '#22c55e'
      : compliancePercent >= 80
        ? '#eab308'
        : '#ef4444';

  return (
    <div className="p-4 rounded-lg bg-muted/30 border border-white/5 space-y-3">
      <div className="flex items-center justify-between">
        <h4 className="font-semibold text-sm">{group.group_name}</h4>
        <span className="text-xs font-mono" style={{ color }}>
          {compliancePercent.toFixed(0)}%
        </span>
      </div>
      <Progress value={compliancePercent} className="h-1.5" />
      <div className="grid grid-cols-2 gap-2 text-xs text-muted-foreground">
        <div>
          <p className="font-medium text-foreground">
            {group.total_assignments}
          </p>
          <p>Назначений</p>
        </div>
        <div>
          <p className="font-medium text-foreground">
            {formatMinutes(group.avg_time_minutes)}
          </p>
          <p>Среднее время</p>
        </div>
        <div>
          <p className="font-medium text-red-500">{group.overdue_count}</p>
          <p>Просрочено</p>
        </div>
        <div>
          <p className="font-medium" style={{ color }}>
            {group.overdue_percent?.toFixed(1) || '0'}%
          </p>
          <p>% просрочки</p>
        </div>
      </div>
    </div>
  );
};

const EmptyState = ({ text }: { text: string }) => (
  <div className="flex flex-col items-center justify-center py-8 text-muted-foreground">
    <Icon name="CheckCircle" size={32} className="mb-2 opacity-50" />
    <p className="text-sm">{text}</p>
  </div>
);

export default SlaAnalytics;
