import { BarChart, Bar, XAxis, YAxis, ResponsiveContainer, Cell } from 'recharts';
import Icon from '@/components/ui/icon';
import { SlaDashboardData } from './useSlaDashboard';

interface SlaCsatCardProps {
  data?: SlaDashboardData;
  loading: boolean;
}

const SlaCsatCard = ({ data, loading }: SlaCsatCardProps) => {
  const csat = data?.csat;
  const hist = (data?.csat_histogram ?? []).map((h) => ({ name: `${h.star}★`, count: h.count, star: h.star }));
  const value = csat?.value ?? 0;
  const fullStars = Math.round(value);

  return (
    <div className="bg-card border border-border rounded-2xl p-5 shadow-sm h-full">
      <h3 className="text-sm font-semibold text-muted-foreground mb-4">Оценка пользователей (CSAT)</h3>
      <div className="flex flex-col sm:flex-row sm:items-center gap-6">
        <div className="shrink-0">
          <div className="flex items-end gap-1">
            <span className="text-4xl font-extrabold text-foreground">{loading ? '—' : value.toFixed(2)}</span>
            <span className="text-lg text-muted-foreground mb-1">/ 5</span>
          </div>
          <div className="flex gap-0.5 mt-2">
            {[1, 2, 3, 4, 5].map((s) => (
              <Icon
                key={s}
                name="Star"
                size={18}
                className={s <= fullStars ? 'text-amber-400' : 'text-muted-foreground/30'}
                fallback="Star"
              />
            ))}
          </div>
          {csat && (
            <div className={`text-xs font-medium mt-2 ${csat.is_increase ? 'text-emerald-500' : 'text-red-500'}`}>
              {csat.is_increase ? '+' : ''}{csat.delta} к прошлому месяцу
            </div>
          )}
        </div>
        <div className="flex-1 h-32 min-w-0">
          {!loading && (
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={hist} margin={{ top: 5, right: 0, left: -20, bottom: 0 }}>
                <XAxis dataKey="name" tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }} axisLine={false} tickLine={false} width={36} />
                <Bar dataKey="count" radius={[4, 4, 0, 0]}>
                  {hist.map((h) => (
                    <Cell key={h.star} fill={h.star >= 4 ? '#a78bfa' : '#c4b5fd'} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>
      </div>
    </div>
  );
};

export default SlaCsatCard;
