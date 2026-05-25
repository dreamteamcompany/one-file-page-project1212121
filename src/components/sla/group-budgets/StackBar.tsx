import { formatMinutes } from './types';

interface StackBarProps {
  totalMinutes: number;
  segments: { name: string; minutes: number; color: string }[];
  title: string;
}

const StackBar = ({ totalMinutes, segments, title }: StackBarProps) => {
  const sum = segments.reduce((s, x) => s + (x.minutes || 0), 0);
  const overflow = totalMinutes > 0 && sum > totalMinutes;
  const remainder = Math.max(0, totalMinutes - sum);
  const base = overflow ? sum : totalMinutes;
  const status = !totalMinutes
    ? { color: 'text-muted-foreground', text: 'Общее время решения не задано' }
    : overflow
      ? {
          color: 'text-red-500',
          text: `Превышение на ${formatMinutes(sum - totalMinutes)} — сохранить нельзя`,
        }
      : sum === totalMinutes
        ? { color: 'text-green-500', text: 'Распределено полностью' }
        : sum === 0
          ? { color: 'text-muted-foreground', text: `Доступно ${formatMinutes(totalMinutes)}` }
          : {
              color: 'text-amber-500',
              text: `Осталось ${formatMinutes(remainder)} (буфер)`,
            };

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <span className="text-xs font-medium text-muted-foreground">{title}</span>
        <span className={`text-xs font-medium ${status.color}`}>{status.text}</span>
      </div>
      <div
        className={`relative w-full h-7 rounded-md overflow-hidden border ${
          overflow ? 'border-red-500/60' : 'border-border'
        } bg-muted/40`}
      >
        {base > 0 && (
          <div className="absolute inset-0 flex">
            {segments.map((seg, i) => {
              if (!seg.minutes) return null;
              const width = (seg.minutes / base) * 100;
              return (
                <div
                  key={i}
                  className="h-full flex items-center justify-center text-[10px] font-semibold text-white truncate px-1"
                  style={{
                    width: `${width}%`,
                    backgroundColor: overflow ? '#ef4444' : seg.color,
                  }}
                  title={`${seg.name}: ${formatMinutes(seg.minutes)}`}
                >
                  {width > 12 ? seg.name : ''}
                </div>
              );
            })}
            {!overflow && remainder > 0 && (
              <div
                className="h-full flex items-center justify-center text-[10px] text-muted-foreground truncate px-1"
                style={{ width: `${(remainder / base) * 100}%` }}
                title={`Остаток: ${formatMinutes(remainder)}`}
              >
                {(remainder / base) * 100 > 12 ? `· ${formatMinutes(remainder)} ·` : ''}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default StackBar;
