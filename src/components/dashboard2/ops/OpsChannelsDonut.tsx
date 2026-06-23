import { PieChart, Pie, Cell, ResponsiveContainer } from 'recharts';
import { OpsChannel } from './useOpsDashboard';

interface OpsChannelsDonutProps {
  channels?: OpsChannel[];
  loading: boolean;
}

const COLORS = ['#6366f1', '#22c55e', '#f59e0b', '#a855f7', '#ec4899', '#06b6d4'];

const OpsChannelsDonut = ({ channels, loading }: OpsChannelsDonutProps) => {
  const list = channels ?? [];
  const total = list.reduce((s, c) => s + c.count, 0);

  return (
    <div className="bg-card border border-border rounded-2xl p-5 shadow-sm h-full">
      <h3 className="text-base font-bold text-foreground mb-4">Новые заявки по каналам</h3>
      {loading ? (
        <div className="text-muted-foreground text-sm">Загрузка…</div>
      ) : (
        <div className="flex items-center gap-4">
          <div className="relative w-32 h-32 shrink-0">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={list}
                  dataKey="count"
                  nameKey="name"
                  cx="50%"
                  cy="50%"
                  innerRadius={42}
                  outerRadius={62}
                  paddingAngle={2}
                  stroke="none"
                >
                  {list.map((_, i) => (
                    <Cell key={i} fill={COLORS[i % COLORS.length]} />
                  ))}
                </Pie>
              </PieChart>
            </ResponsiveContainer>
            <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
              <span className="text-xl font-bold text-foreground leading-none">{total}</span>
              <span className="text-[10px] text-muted-foreground">всего</span>
            </div>
          </div>
          <div className="flex-1 flex flex-col gap-2">
            {list.map((c, i) => (
              <div key={c.name} className="flex items-center justify-between gap-2">
                <span className="flex items-center gap-2 text-xs text-muted-foreground min-w-0">
                  <span
                    className="w-2.5 h-2.5 rounded-full shrink-0"
                    style={{ backgroundColor: COLORS[i % COLORS.length] }}
                  />
                  <span className="truncate">{c.name}</span>
                </span>
                <span className="text-xs font-semibold text-foreground whitespace-nowrap">{c.percent}%</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default OpsChannelsDonut;
