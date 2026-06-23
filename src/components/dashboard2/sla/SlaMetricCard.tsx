import { AreaChart, Area, ResponsiveContainer } from 'recharts';
import { TrendPoint } from './useSlaDashboard';

interface SlaMetricCardProps {
  title: string;
  value: string;
  delta: string;
  isIncrease: boolean;
  trend: TrendPoint[];
  color: string;
  loading: boolean;
}

const SlaMetricCard = ({ title, value, delta, isIncrease, trend, color, loading }: SlaMetricCardProps) => {
  const gradId = `grad-${title.replace(/\s/g, '')}`;
  return (
    <div className="bg-card border border-border rounded-2xl p-5 shadow-sm h-full flex flex-col">
      <h3 className="text-sm font-semibold text-muted-foreground mb-2">{title}</h3>
      <div className="text-2xl font-bold text-foreground">{loading ? '—' : value}</div>
      <div className={`text-xs font-medium mt-1.5 ${isIncrease ? 'text-red-500' : 'text-emerald-500'}`}>
        {delta} к прошлому месяцу
      </div>
      <div className="h-16 mt-3 -mx-1">
        {!loading && (
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={trend} margin={{ top: 4, right: 0, left: 0, bottom: 0 }}>
              <defs>
                <linearGradient id={gradId} x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor={color} stopOpacity={0.35} />
                  <stop offset="100%" stopColor={color} stopOpacity={0} />
                </linearGradient>
              </defs>
              <Area type="monotone" dataKey="v" stroke={color} strokeWidth={2} fill={`url(#${gradId})`} dot={false} />
            </AreaChart>
          </ResponsiveContainer>
        )}
      </div>
    </div>
  );
};

export default SlaMetricCard;
