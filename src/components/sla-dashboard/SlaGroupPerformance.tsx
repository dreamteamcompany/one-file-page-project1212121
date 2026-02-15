import { Card, CardContent } from '@/components/ui/card';
import Icon from '@/components/ui/icon';
import { Progress } from '@/components/ui/progress';
import { formatMinutes } from './sla-utils';

interface GroupPerformance {
  executor_group_id: number;
  group_name: string;
  total_assignments: number;
  avg_time_minutes: number;
  overdue_count: number;
  overdue_percent: number;
}

interface Props {
  items: GroupPerformance[];
}

const getPerformanceColor = (overduePercent: number) => {
  if (overduePercent <= 5) return '#22c55e';
  if (overduePercent <= 20) return '#eab308';
  return '#ef4444';
};

const GroupCard = ({ group }: { group: GroupPerformance }) => {
  const color = getPerformanceColor(group.overdue_percent || 0);
  const compliancePercent = 100 - (group.overdue_percent || 0);

  return (
    <Card className="bg-muted/20 border-white/5">
      <CardContent className="p-4 space-y-3">
        <div className="flex items-center gap-2">
          <div
            className="w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0"
            style={{ backgroundColor: `${color}20` }}
          >
            <Icon name="Users" size={16} style={{ color }} />
          </div>
          <span className="font-semibold text-sm">{group.group_name}</span>
        </div>

        <div className="grid grid-cols-2 gap-2 text-xs">
          <div>
            <p className="text-muted-foreground">Заявок</p>
            <p className="font-semibold text-base">{group.total_assignments}</p>
          </div>
          <div>
            <p className="text-muted-foreground">Среднее время</p>
            <p className="font-semibold text-base">{formatMinutes(group.avg_time_minutes)}</p>
          </div>
        </div>

        <div className="space-y-1">
          <div className="flex justify-between text-xs">
            <span className="text-muted-foreground">Соблюдение бюджета</span>
            <span className="font-semibold" style={{ color }}>
              {compliancePercent.toFixed(1)}%
            </span>
          </div>
          <Progress
            value={compliancePercent}
            className="h-2"
            style={{ '--progress-color': color } as React.CSSProperties}
          />
        </div>

        {group.overdue_count > 0 && (
          <div className="flex items-center gap-1.5 text-xs text-red-500">
            <Icon name="AlertTriangle" size={12} />
            <span>Просрочено: {group.overdue_count}</span>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

const SlaGroupPerformance = ({ items }: Props) => {
  return (
    <Card className="bg-card/50 border-white/10">
      <CardContent className="p-6">
        <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
          <Icon name="Activity" size={20} className="text-primary" />
          Эффективность групп
        </h3>
        {items.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-8 text-muted-foreground">
            <Icon name="Users" size={40} className="mb-2 opacity-30" />
            <p className="text-sm">Данных пока нет — группы ещё не обрабатывали заявки</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {items.map((group) => (
              <GroupCard key={group.executor_group_id} group={group} />
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default SlaGroupPerformance;
