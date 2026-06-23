import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import Icon from '@/components/ui/icon';
import { ServicesDashboardData } from './useServicesDashboard';

interface ServicesTopRowProps {
  data?: ServicesDashboardData;
  loading: boolean;
}

const LINE_COLORS = ['#6366f1', '#22c55e', '#f59e0b', '#ec4899', '#06b6d4'];

const Card = ({ title, children }: { title: string; children: React.ReactNode }) => (
  <div className="bg-card border border-border rounded-2xl p-5 shadow-sm h-full flex flex-col">
    <h3 className="text-sm font-semibold text-muted-foreground mb-4">{title}</h3>
    {children}
  </div>
);

const ServicesTopRow = ({ data, loading }: ServicesTopRowProps) => {
  const topServices = data?.top_services ?? [];
  const topProblems = data?.top_problems ?? [];
  const dynamics = data?.dynamics ?? [];
  const series = data?.dynamics_series ?? [];

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
      <Card title="Топ услуг по количеству заявок">
        <div className="flex-1">
          <div className="grid grid-cols-[1fr_auto_auto] gap-x-4 text-xs text-muted-foreground pb-2 border-b border-border">
            <span>Услуга</span>
            <span className="text-right">Заявок</span>
            <span className="text-right w-12">Доля</span>
          </div>
          {loading ? (
            <div className="text-muted-foreground text-sm py-3">Загрузка…</div>
          ) : (
            topServices.map((s) => (
              <div key={s.name} className="grid grid-cols-[1fr_auto_auto] gap-x-4 py-2.5 border-b border-border/50 last:border-0 items-center">
                <span className="text-sm text-foreground truncate">{s.name}</span>
                <span className="text-sm font-semibold text-foreground text-right">{s.count}</span>
                <span className="text-sm text-muted-foreground text-right w-12">{s.share}%</span>
              </div>
            ))
          )}
        </div>
        <button className="mt-3 text-sm font-medium text-indigo-500 hover:text-indigo-600 flex items-center gap-1 self-start">
          Смотреть все услуги <Icon name="ArrowRight" size={14} />
        </button>
      </Card>

      <Card title="Динамика по услугам">
        <div className="flex flex-wrap items-center gap-3 mb-3 text-xs">
          {series.map((s, i) => (
            <span key={s.key} className="flex items-center gap-1.5 text-muted-foreground">
              <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: LINE_COLORS[i % LINE_COLORS.length] }} />
              <span className="truncate max-w-[110px]">{s.name}</span>
            </span>
          ))}
        </div>
        <div className="flex-1 min-h-[200px]">
          {!loading && (
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={dynamics} margin={{ top: 5, right: 10, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
                <XAxis dataKey="day" tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }} axisLine={false} tickLine={false} interval="preserveStartEnd" minTickGap={24} />
                <YAxis tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }} axisLine={false} tickLine={false} width={32} />
                <Tooltip contentStyle={{ background: 'hsl(var(--card))', border: '1px solid hsl(var(--border))', borderRadius: 12, fontSize: 12, color: 'hsl(var(--foreground))' }} />
                {series.map((s, i) => (
                  <Line key={s.key} type="monotone" dataKey={s.key} name={s.name} stroke={LINE_COLORS[i % LINE_COLORS.length]} strokeWidth={2} dot={false} />
                ))}
              </LineChart>
            </ResponsiveContainer>
          )}
        </div>
      </Card>

      <Card title="Топ проблем">
        <div className="flex-1">
          <div className="grid grid-cols-[1fr_auto] gap-x-4 text-xs text-muted-foreground pb-2 border-b border-border">
            <span>Проблема</span>
            <span className="text-right">Заявок</span>
          </div>
          {loading ? (
            <div className="text-muted-foreground text-sm py-3">Загрузка…</div>
          ) : (
            topProblems.map((p, i) => (
              <div key={`${p.title}-${i}`} className="grid grid-cols-[1fr_auto] gap-x-4 py-2.5 border-b border-border/50 last:border-0 items-center">
                <span className="text-sm text-foreground truncate">{p.title}</span>
                <span className="text-sm font-semibold text-foreground text-right">{p.count}</span>
              </div>
            ))
          )}
        </div>
        <button className="mt-3 text-sm font-medium text-indigo-500 hover:text-indigo-600 flex items-center gap-1 self-start">
          Смотреть все проблемы <Icon name="ArrowRight" size={14} />
        </button>
      </Card>
    </div>
  );
};

export default ServicesTopRow;
