import { PieChart, Pie, Cell, ResponsiveContainer } from 'recharts';
import { SlaDashboardData } from './useSlaDashboard';

interface SlaTopRowProps {
  data?: SlaDashboardData;
  loading: boolean;
}

const Card = ({ title, children }: { title: string; children: React.ReactNode }) => (
  <div className="bg-card border border-border rounded-2xl p-5 shadow-sm h-full">
    <h3 className="text-sm font-semibold text-muted-foreground mb-4">{title}</h3>
    {children}
  </div>
);

const SlaTopRow = ({ data, loading }: SlaTopRowProps) => {
  const comp = data?.sla_compliance;
  const split = data?.sla_split;
  const byPriority = data?.sla_by_priority ?? [];

  const pieData = split
    ? [
        { name: 'В срок', value: split.on_time, color: '#22c55e' },
        { name: 'Просрочено', value: split.overdue, color: '#ef4444' },
      ]
    : [];

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
      <Card title="Соблюдение SLA">
        <div className="text-4xl font-extrabold text-foreground">
          {loading || !comp ? '—' : `${comp.value}%`}
        </div>
        {comp && (
          <div className={`text-xs font-medium mt-2 ${comp.is_increase ? 'text-emerald-500' : 'text-red-500'}`}>
            {comp.is_increase ? '+' : ''}{comp.delta}% к прошлому месяцу
          </div>
        )}
        <div className="h-2 rounded-full bg-muted overflow-hidden mt-3">
          <div className="h-full rounded-full bg-emerald-500" style={{ width: `${comp?.value ?? 0}%` }} />
        </div>
      </Card>

      <Card title="SLA в срок / просрочено">
        <div className="flex items-center gap-4">
          <div className="relative w-28 h-28 shrink-0">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie data={pieData} dataKey="value" cx="50%" cy="50%" innerRadius={38} outerRadius={55} paddingAngle={2} stroke="none">
                  {pieData.map((d, i) => (
                    <Cell key={i} fill={d.color} />
                  ))}
                </Pie>
              </PieChart>
            </ResponsiveContainer>
          </div>
          <div className="flex flex-col gap-3 text-xs">
            <div className="flex items-start gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 mt-1" />
              <div>
                <div className="text-muted-foreground">В срок</div>
                <div className="font-semibold text-foreground">
                  {split?.on_time ?? 0} <span className="text-muted-foreground font-normal">({split?.on_time_pct ?? 0}%)</span>
                </div>
              </div>
            </div>
            <div className="flex items-start gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-red-500 mt-1" />
              <div>
                <div className="text-muted-foreground">Просрочено</div>
                <div className="font-semibold text-foreground">
                  {split?.overdue ?? 0} <span className="text-muted-foreground font-normal">({split?.overdue_pct ?? 0}%)</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </Card>

      <Card title="SLA по приоритетам">
        <div className="flex flex-col gap-3">
          {byPriority.map((p) => (
            <div key={p.name} className="flex items-center gap-3">
              <span className="text-xs text-muted-foreground w-20 shrink-0">{p.name}</span>
              <span className="text-xs font-semibold text-foreground w-9 shrink-0">{p.percent}%</span>
              <div className="h-2 rounded-full bg-muted overflow-hidden flex-1">
                <div className="h-full rounded-full" style={{ width: `${p.percent}%`, backgroundColor: p.color }} />
              </div>
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
};

export default SlaTopRow;
