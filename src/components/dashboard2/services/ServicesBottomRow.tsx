import Icon from '@/components/ui/icon';
import { ServicesDashboardData } from './useServicesDashboard';

interface ServicesBottomRowProps {
  data?: ServicesDashboardData;
  loading: boolean;
}

const costStyle = (tone: 'high' | 'mid' | 'low') => {
  if (tone === 'high') return { color: 'text-red-500', icon: 'CircleDot' };
  if (tone === 'mid') return { color: 'text-amber-500', icon: 'CircleDot' };
  return { color: 'text-emerald-500', icon: 'CircleDot' };
};

const ServicesBottomRow = ({ data, loading }: ServicesBottomRowProps) => {
  const highVolume = data?.high_volume ?? [];
  const costServices = data?.cost_services ?? [];

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
      <div className="lg:col-span-2 bg-card border border-border rounded-2xl p-5 shadow-sm">
        <h3 className="text-sm font-semibold text-muted-foreground mb-4">Услуги с высоким уровнем обращений</h3>
        <div className="overflow-x-auto">
          <div className="min-w-[560px]">
            <div className="grid grid-cols-[1.5fr_0.8fr_1fr_1.2fr_1fr] gap-x-4 text-xs text-muted-foreground pb-2 border-b border-border">
              <span>Услуга</span>
              <span className="text-right">Заявок</span>
              <span className="text-right">Изменение</span>
              <span className="text-right">Среднее время решения</span>
              <span className="text-right">Повторно открытые</span>
            </div>
            {loading ? (
              <div className="text-muted-foreground text-sm py-3">Загрузка…</div>
            ) : (
              highVolume.map((s) => (
                <div key={s.name} className="grid grid-cols-[1.5fr_0.8fr_1fr_1.2fr_1fr] gap-x-4 py-2.5 border-b border-border/50 last:border-0 items-center">
                  <span className="text-sm text-foreground truncate">{s.name}</span>
                  <span className="text-sm font-semibold text-foreground text-right">{s.count}</span>
                  <span className={`text-sm font-medium text-right ${s.change >= 0 ? 'text-emerald-500' : 'text-red-500'}`}>
                    {s.change >= 0 ? '+' : ''}{s.change}%
                  </span>
                  <span className="text-sm text-muted-foreground text-right">{s.avg_resolve}</span>
                  <span className="text-sm text-muted-foreground text-right">
                    {s.reopened} ({s.reopened_pct}%)
                  </span>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      <div className="bg-card border border-border rounded-2xl p-5 shadow-sm">
        <h3 className="text-sm font-semibold text-muted-foreground mb-4">Стоимость услуг (оценка)</h3>
        <div className="grid grid-cols-[1fr_auto] gap-x-4 text-xs text-muted-foreground pb-2 border-b border-border">
          <span>Услуга</span>
          <span className="text-right">Оценка</span>
        </div>
        {loading ? (
          <div className="text-muted-foreground text-sm py-3">Загрузка…</div>
        ) : (
          costServices.map((s) => {
            const st = costStyle(s.cost.tone);
            return (
              <div key={s.name} className="grid grid-cols-[1fr_auto] gap-x-4 py-2.5 border-b border-border/50 last:border-0 items-center">
                <span className="text-sm text-foreground truncate">{s.name}</span>
                <span className={`text-sm font-medium text-right flex items-center justify-end gap-1.5 ${st.color}`}>
                  <Icon name={st.icon} size={12} />
                  {s.cost.label}
                </span>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};

export default ServicesBottomRow;
