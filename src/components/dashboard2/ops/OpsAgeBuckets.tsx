import { OpsAgeBucket } from './useOpsDashboard';

interface OpsAgeBucketsProps {
  buckets?: OpsAgeBucket[];
  loading: boolean;
}

const barColors = ['bg-emerald-500', 'bg-indigo-500', 'bg-amber-500', 'bg-red-500'];

const OpsAgeBuckets = ({ buckets, loading }: OpsAgeBucketsProps) => {
  const list = buckets ?? [];

  return (
    <div className="bg-card border border-border rounded-2xl p-5 shadow-sm h-full">
      <h3 className="text-base font-bold text-foreground mb-4">Возраст активных заявок</h3>
      <div className="flex flex-col gap-4">
        {loading ? (
          <div className="text-muted-foreground text-sm">Загрузка…</div>
        ) : (
          list.map((b, i) => (
            <div key={b.label}>
              <div className="flex items-center justify-between mb-1.5">
                <span className="text-xs text-muted-foreground">{b.label}</span>
                <span className="text-xs font-semibold text-foreground">
                  {b.count} <span className="text-muted-foreground font-normal">({b.percent}%)</span>
                </span>
              </div>
              <div className="h-2 rounded-full bg-muted overflow-hidden">
                <div
                  className={`h-full rounded-full ${barColors[i % barColors.length]}`}
                  style={{ width: `${b.percent}%` }}
                />
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
};

export default OpsAgeBuckets;
