interface OpsHeatmapProps {
  heatmap?: Record<string, number>;
  max?: number;
  loading: boolean;
}

const days = ['Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб', 'Вс'];
const hours = Array.from({ length: 24 }, (_, h) => h);

const OpsHeatmap = ({ heatmap, max = 0, loading }: OpsHeatmapProps) => {
  const map = heatmap ?? {};
  const safeMax = max > 0 ? max : 1;

  const cellColor = (value: number) => {
    if (value <= 0) return 'rgba(99, 102, 241, 0.06)';
    const intensity = Math.min(value / safeMax, 1);
    const alpha = 0.15 + intensity * 0.85;
    return `rgba(99, 102, 241, ${alpha})`;
  };

  return (
    <div className="bg-card border border-border rounded-2xl p-5 shadow-sm h-full">
      <h3 className="text-base font-bold text-foreground mb-4">Нагрузка по часам</h3>
      {loading ? (
        <div className="text-muted-foreground text-sm">Загрузка…</div>
      ) : (
        <>
          <div className="flex flex-col gap-1">
            {days.map((day, row) => (
              <div key={day} className="flex items-center gap-1.5">
                <span className="text-[10px] text-muted-foreground w-5 shrink-0">{day}</span>
                <div className="flex gap-[3px] flex-1">
                  {hours.map((h) => {
                    const v = map[`${row}-${h}`] || 0;
                    return (
                      <div
                        key={h}
                        className="flex-1 aspect-square rounded-[3px]"
                        style={{ backgroundColor: cellColor(v) }}
                        title={`${day}, ${h}:00 — ${v} заявок`}
                      />
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
          <div className="flex items-center justify-end gap-2 mt-3 text-[10px] text-muted-foreground">
            <span>Низкая</span>
            <div className="flex gap-[3px]">
              {[0.15, 0.4, 0.65, 0.9].map((a) => (
                <div key={a} className="w-3 h-3 rounded-[3px]" style={{ backgroundColor: `rgba(99,102,241,${a})` }} />
              ))}
            </div>
            <span>Высокая</span>
          </div>
        </>
      )}
    </div>
  );
};

export default OpsHeatmap;
