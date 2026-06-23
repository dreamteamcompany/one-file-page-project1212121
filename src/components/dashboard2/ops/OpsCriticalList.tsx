import Icon from '@/components/ui/icon';
import { useNavigate } from 'react-router-dom';
import { OpsCritical } from './useOpsDashboard';

interface OpsCriticalListProps {
  items?: OpsCritical[];
  loading: boolean;
}

const OpsCriticalList = ({ items, loading }: OpsCriticalListProps) => {
  const navigate = useNavigate();
  const list = items ?? [];

  return (
    <div className="bg-card border border-border rounded-2xl p-5 shadow-sm h-full flex flex-col">
      <h3 className="text-base font-bold text-foreground mb-4">Критические заявки</h3>
      <div className="flex-1 flex flex-col gap-3">
        {loading ? (
          <div className="text-muted-foreground text-sm">Загрузка…</div>
        ) : list.length === 0 ? (
          <div className="text-muted-foreground text-sm">Нет критических заявок</div>
        ) : (
          list.map((t) => (
            <div key={t.id} className="flex items-start gap-3">
              <div className="w-7 h-7 rounded-lg bg-red-50 dark:bg-red-500/10 flex items-center justify-center shrink-0 mt-0.5">
                <Icon name="AlertTriangle" size={15} className="text-red-500" />
              </div>
              <div className="min-w-0 flex-1">
                <div className="text-sm font-semibold text-foreground truncate">{t.title}</div>
                <div className="flex items-center justify-between gap-2 mt-0.5">
                  <span className="text-xs text-muted-foreground truncate">{t.author}</span>
                  <span className="text-xs text-red-500 font-medium whitespace-nowrap">{t.age}</span>
                </div>
              </div>
            </div>
          ))
        )}
      </div>
      <button
        onClick={() => navigate('/')}
        className="mt-4 text-sm font-medium text-indigo-500 hover:text-indigo-600 flex items-center gap-1 self-start"
      >
        Перейти к списку
        <Icon name="ArrowRight" size={14} />
      </button>
    </div>
  );
};

export default OpsCriticalList;
