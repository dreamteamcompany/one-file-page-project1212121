import { PieChart, Pie, Cell, ResponsiveContainer } from 'recharts';
import { SlaDashboardData } from './useSlaDashboard';

interface SlaRatingDistributionProps {
  data?: SlaDashboardData;
  loading: boolean;
}

const STAR_COLORS: Record<number, string> = {
  5: '#22c55e',
  4: '#84cc16',
  3: '#f59e0b',
  2: '#f97316',
  1: '#ef4444',
};

const SlaRatingDistribution = ({ data, loading }: SlaRatingDistributionProps) => {
  const dist = data?.rating_distribution ?? [];
  const total = data?.rating_total ?? 0;
  const pieData = dist.filter((d) => d.count > 0).map((d) => ({ name: `${d.star}`, value: d.count, color: STAR_COLORS[d.star] }));

  return (
    <div className="bg-card border border-border rounded-2xl p-5 shadow-sm h-full">
      <h3 className="text-sm font-semibold text-muted-foreground mb-4">Распределение оценок</h3>
      <div className="flex items-center gap-5">
        <div className="relative w-32 h-32 shrink-0">
          {!loading && (
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie data={pieData} dataKey="value" cx="50%" cy="50%" innerRadius={44} outerRadius={62} paddingAngle={2} stroke="none">
                  {pieData.map((d, i) => (
                    <Cell key={i} fill={d.color} />
                  ))}
                </Pie>
              </PieChart>
            </ResponsiveContainer>
          )}
          <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
            <span className="text-xl font-bold text-foreground leading-none">{total}</span>
            <span className="text-[10px] text-muted-foreground">оценок</span>
          </div>
        </div>
        <div className="flex-1 flex flex-col gap-2">
          {dist.map((d) => (
            <div key={d.star} className="flex items-center justify-between gap-2">
              <span className="flex items-center gap-2 text-xs text-muted-foreground">
                <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: STAR_COLORS[d.star] }} />
                {d.star} {d.star === 1 ? 'звезда' : d.star < 5 ? 'звезды' : 'звёзд'}
              </span>
              <span className="text-xs font-semibold text-foreground whitespace-nowrap">
                {d.percent}% <span className="text-muted-foreground font-normal">({d.count})</span>
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default SlaRatingDistribution;
