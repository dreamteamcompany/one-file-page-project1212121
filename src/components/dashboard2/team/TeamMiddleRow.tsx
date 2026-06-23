import Icon from '@/components/ui/icon';
import { TeamDashboardData } from './useTeamDashboard';

interface TeamMiddleRowProps {
  data?: TeamDashboardData;
  loading: boolean;
}

const initials = (name: string) =>
  name
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0])
    .join('')
    .toUpperCase();

const Stars = ({ value }: { value: number }) => (
  <span className="flex gap-0.5">
    {[1, 2, 3, 4, 5].map((s) => (
      <Icon key={s} name="Star" size={12} className={s <= Math.round(value) ? 'text-amber-400' : 'text-muted-foreground/30'} />
    ))}
  </span>
);

const BAR_COLORS = ['#6366f1', '#8b5cf6', '#a855f7', '#22c55e', '#06b6d4'];

const TeamMiddleRow = ({ data, loading }: TeamMiddleRowProps) => {
  const rating = data?.engineers_rating ?? [];
  const workload = data?.workload ?? [];
  const maxActive = Math.max(1, ...workload.map((w) => w.active));

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
      <div className="lg:col-span-2 bg-card border border-border rounded-2xl p-5 shadow-sm flex flex-col">
        <h3 className="text-sm font-semibold text-muted-foreground mb-4">Рейтинг инженеров</h3>
        <div className="overflow-x-auto flex-1">
          <div className="min-w-[520px]">
            <div className="grid grid-cols-[1.6fr_0.9fr_1.1fr_0.8fr_1fr] gap-x-4 text-xs text-muted-foreground pb-2 border-b border-border">
              <span>Инженер</span>
              <span className="text-right">Закрыто заявок</span>
              <span className="text-right">Среднее время решения</span>
              <span className="text-right">SLA соблюдено</span>
              <span className="text-right">Оценка клиентов</span>
            </div>
            {loading ? (
              <div className="text-muted-foreground text-sm py-3">Загрузка…</div>
            ) : (
              rating.map((e) => (
                <div key={e.id} className="grid grid-cols-[1.6fr_0.9fr_1.1fr_0.8fr_1fr] gap-x-4 py-2.5 border-b border-border/50 last:border-0 items-center">
                  <span className="flex items-center gap-2 min-w-0">
                    <span className="w-7 h-7 rounded-full bg-indigo-100 dark:bg-indigo-500/20 text-indigo-600 dark:text-indigo-300 text-[10px] font-bold flex items-center justify-center shrink-0 overflow-hidden">
                      {e.photo ? <img src={e.photo} alt="" className="w-full h-full object-cover" /> : initials(e.name)}
                    </span>
                    <span className="text-sm text-foreground truncate">{e.name}</span>
                  </span>
                  <span className="text-sm font-semibold text-foreground text-right">{e.closed}</span>
                  <span className="text-sm text-muted-foreground text-right">{e.avg_resolve}</span>
                  <span className="text-sm text-muted-foreground text-right">{e.sla}%</span>
                  <span className="text-sm text-foreground text-right flex items-center justify-end gap-1.5">
                    <Stars value={e.rating} />
                    <span className="font-semibold">{e.rating.toFixed(1)}</span>
                  </span>
                </div>
              ))
            )}
          </div>
        </div>
        <button className="mt-3 text-sm font-medium text-indigo-500 hover:text-indigo-600 flex items-center gap-1 self-start">
          Смотреть всех инженеров <Icon name="ArrowRight" size={14} />
        </button>
      </div>

      <div className="bg-card border border-border rounded-2xl p-5 shadow-sm">
        <h3 className="text-sm font-semibold text-muted-foreground mb-4">Нагрузка по инженерам</h3>
        <div className="flex flex-col gap-3">
          {loading ? (
            <div className="text-muted-foreground text-sm">Загрузка…</div>
          ) : (
            workload.map((w, i) => (
              <div key={w.id} className="flex items-center gap-3">
                <span className="text-xs text-muted-foreground w-28 truncate shrink-0">{w.name}</span>
                <div className="flex-1 h-4 rounded-full bg-muted overflow-hidden">
                  <div
                    className="h-full rounded-full"
                    style={{ width: `${(w.active / maxActive) * 100}%`, backgroundColor: BAR_COLORS[i % BAR_COLORS.length] }}
                  />
                </div>
                <span className="text-xs font-semibold text-foreground w-6 text-right">{w.active}</span>
              </div>
            ))
          )}
        </div>
        <div className="text-xs text-muted-foreground mt-3 text-center">Активных заявок</div>
      </div>
    </div>
  );
};

export default TeamMiddleRow;
