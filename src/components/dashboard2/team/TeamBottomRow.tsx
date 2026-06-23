import { PieChart, Pie, Cell, ResponsiveContainer, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip } from 'recharts';
import { TeamDashboardData } from './useTeamDashboard';

interface TeamBottomRowProps {
  data?: TeamDashboardData;
  loading: boolean;
}

const COLORS = ['#6366f1', '#8b5cf6', '#22c55e', '#f59e0b', '#ec4899', '#06b6d4'];

const TeamBottomRow = ({ data, loading }: TeamBottomRowProps) => {
  const dist = data?.distribution ?? [];
  const total = data?.distribution_total ?? 0;
  const perf = data?.performance ?? [];

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
      <div className="bg-card border border-border rounded-2xl p-5 shadow-sm">
        <h3 className="text-sm font-semibold text-muted-foreground mb-4">Распределение закрытых заявок</h3>
        {loading ? (
          <div className="text-muted-foreground text-sm">Загрузка…</div>
        ) : (
          <div className="flex items-center gap-5">
            <div className="relative w-36 h-36 shrink-0">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={dist} dataKey="count" nameKey="name" cx="50%" cy="50%" innerRadius={48} outerRadius={68} paddingAngle={2} stroke="none">
                    {dist.map((_, i) => (
                      <Cell key={i} fill={COLORS[i % COLORS.length]} />
                    ))}
                  </Pie>
                </PieChart>
              </ResponsiveContainer>
              <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                <span className="text-xl font-bold text-foreground leading-none">{total.toLocaleString('ru-RU')}</span>
              </div>
            </div>
            <div className="flex-1 flex flex-col gap-2">
              {dist.map((d, i) => (
                <div key={d.name} className="flex items-center justify-between gap-2">
                  <span className="flex items-center gap-2 text-xs text-muted-foreground min-w-0">
                    <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: COLORS[i % COLORS.length] }} />
                    <span className="truncate">{d.name}</span>
                  </span>
                  <span className="text-xs font-semibold text-foreground whitespace-nowrap">
                    {d.percent}% <span className="text-muted-foreground font-normal">({d.count})</span>
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      <div className="bg-card border border-border rounded-2xl p-5 shadow-sm">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-sm font-semibold text-muted-foreground">Динамика производительности</h3>
          <div className="flex items-center gap-3 text-xs">
            <span className="flex items-center gap-1.5 text-muted-foreground"><span className="w-2.5 h-2.5 rounded-full bg-indigo-500" /> Закрыто заявок</span>
            <span className="flex items-center gap-1.5 text-muted-foreground"><span className="w-2.5 h-2.5 rounded-full bg-emerald-500" /> SLA соблюдено (%)</span>
          </div>
        </div>
        <div className="h-48">
          {!loading && (
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={perf} margin={{ top: 5, right: 5, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
                <XAxis dataKey="day" tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }} axisLine={false} tickLine={false} interval="preserveStartEnd" minTickGap={24} />
                <YAxis yAxisId="left" tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }} axisLine={false} tickLine={false} width={32} />
                <YAxis yAxisId="right" orientation="right" domain={[80, 100]} tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }} axisLine={false} tickLine={false} width={36} />
                <Tooltip contentStyle={{ background: 'hsl(var(--card))', border: '1px solid hsl(var(--border))', borderRadius: 12, fontSize: 12, color: 'hsl(var(--foreground))' }} />
                <Line yAxisId="left" type="monotone" dataKey="closed" name="Закрыто заявок" stroke="#6366f1" strokeWidth={2} dot={false} />
                <Line yAxisId="right" type="monotone" dataKey="sla" name="SLA соблюдено (%)" stroke="#22c55e" strokeWidth={2} dot={false} />
              </LineChart>
            </ResponsiveContainer>
          )}
        </div>
      </div>
    </div>
  );
};

export default TeamBottomRow;
