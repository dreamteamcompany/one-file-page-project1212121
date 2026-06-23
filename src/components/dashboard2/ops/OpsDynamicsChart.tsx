import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { OpsDynamicPoint } from './useOpsDashboard';

interface OpsDynamicsChartProps {
  data?: OpsDynamicPoint[];
  loading: boolean;
}

const OpsDynamicsChart = ({ data, loading }: OpsDynamicsChartProps) => {
  const points = data ?? [];

  return (
    <div className="bg-card border border-border rounded-2xl p-5 shadow-sm h-full flex flex-col">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-base font-bold text-foreground">Динамика заявок</h3>
        <div className="flex items-center gap-4 text-xs">
          <span className="flex items-center gap-1.5 text-muted-foreground">
            <span className="w-2.5 h-2.5 rounded-full bg-indigo-500" /> Создано
          </span>
          <span className="flex items-center gap-1.5 text-muted-foreground">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-500" /> Закрыто
          </span>
          <span className="flex items-center gap-1.5 text-muted-foreground">
            <span className="w-2.5 h-2.5 rounded-full bg-violet-400" /> Остаток в работе
          </span>
        </div>
      </div>
      <div className="flex-1 min-h-[240px]">
        {loading ? (
          <div className="h-full flex items-center justify-center text-muted-foreground text-sm">Загрузка…</div>
        ) : (
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={points} margin={{ top: 5, right: 10, left: -15, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
              <XAxis
                dataKey="day"
                tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }}
                axisLine={false}
                tickLine={false}
                interval="preserveStartEnd"
                minTickGap={24}
              />
              <YAxis
                tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }}
                axisLine={false}
                tickLine={false}
                width={40}
              />
              <Tooltip
                contentStyle={{
                  background: 'hsl(var(--card))',
                  border: '1px solid hsl(var(--border))',
                  borderRadius: 12,
                  fontSize: 12,
                  color: 'hsl(var(--foreground))',
                }}
              />
              <Line type="monotone" dataKey="created" name="Создано" stroke="#6366f1" strokeWidth={2.5} dot={false} />
              <Line type="monotone" dataKey="closed" name="Закрыто" stroke="#22c55e" strokeWidth={2.5} dot={false} />
              <Line type="monotone" dataKey="open" name="Остаток в работе" stroke="#a78bfa" strokeWidth={2} strokeDasharray="5 4" dot={false} />
            </LineChart>
          </ResponsiveContainer>
        )}
      </div>
    </div>
  );
};

export default OpsDynamicsChart;
