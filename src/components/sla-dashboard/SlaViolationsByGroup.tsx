import { Card, CardContent } from '@/components/ui/card';
import Icon from '@/components/ui/icon';
import { formatMinutes } from './sla-utils';

interface ViolationByGroup {
  executor_group_id: number;
  group_name: string;
  violation_count: number;
  avg_overdue_minutes: number;
  max_overdue_minutes: number;
}

interface Props {
  items: ViolationByGroup[];
}

const SlaViolationsByGroup = ({ items }: Props) => {
  return (
    <Card className="bg-card/50 border-white/10">
      <CardContent className="p-6">
        <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
          <Icon name="Users" size={20} className="text-primary" />
          Нарушения по группам
        </h3>
        {items.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-8 text-muted-foreground">
            <Icon name="CheckCircle2" size={40} className="mb-2 opacity-30" />
            <p className="text-sm">Нарушений по группам нет</p>
          </div>
        ) : (
          <div className="space-y-4">
            {items.map((item) => (
              <div key={item.executor_group_id} className="space-y-1">
                <div className="flex justify-between text-sm">
                  <span className="font-medium">{item.group_name}</span>
                  <span className="font-semibold text-red-500">{item.violation_count}</span>
                </div>
                <div className="flex items-center gap-3 text-xs text-muted-foreground">
                  <span>Среднее: {formatMinutes(item.avg_overdue_minutes)}</span>
                  <span>Макс: {formatMinutes(item.max_overdue_minutes)}</span>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default SlaViolationsByGroup;
