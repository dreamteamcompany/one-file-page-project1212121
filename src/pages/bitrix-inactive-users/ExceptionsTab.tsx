import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import Icon from '@/components/ui/icon';
import { ExceptionItem } from './types';
import { formatDateOnlyMSK } from '@/utils/dateFormat';

interface ExceptionsTabProps {
  exceptionsLoading: boolean;
  filteredExceptions: ExceptionItem[];
  excSearch: string;
  isAdmin: boolean;
  onExcSearchChange: (value: string) => void;
  onAddModalOpen: () => void;
  onRemoveTarget: (item: ExceptionItem) => void;
}

const ExceptionsTab = ({
  exceptionsLoading,
  filteredExceptions,
  excSearch,
  isAdmin,
  onExcSearchChange,
  onAddModalOpen,
  onRemoveTarget,
}: ExceptionsTabProps) => {
  return (
    <>
      <div className="flex flex-wrap gap-3 mb-6">
        <Input
          placeholder="Поиск по имени, email, должности..."
          value={excSearch}
          onChange={e => onExcSearchChange(e.target.value)}
          className="max-w-xs"
        />
      </div>

      {exceptionsLoading ? (
        <div className="flex items-center justify-center py-20">
          <Icon name="Loader2" size={32} className="animate-spin text-primary" />
        </div>
      ) : (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">
              В списке: {filteredExceptions.length}
            </CardTitle>
          </CardHeader>
          <CardContent>
            {filteredExceptions.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <Icon name="ShieldOff" size={40} className="mx-auto mb-3 opacity-30" />
                <p className="text-sm">Список исключений пуст</p>
                {isAdmin && (
                  <Button size="sm" variant="outline" className="mt-3 gap-2" onClick={onAddModalOpen}>
                    <Icon name="Plus" size={14} />
                    Добавить
                  </Button>
                )}
              </div>
            ) : (
              <div className="space-y-2">
                {filteredExceptions.map(e => (
                  <div key={e.id} className="p-3 rounded-lg border bg-muted/20 hover:bg-muted/40 transition-colors flex items-start justify-between gap-3">
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium">{e.full_name}</p>
                      <div className="flex flex-wrap items-center gap-2 mt-1">
                        {e.email && <span className="text-xs text-muted-foreground">{e.email}</span>}
                        {e.position && (
                          <Badge variant="secondary" className="text-xs">{e.position}</Badge>
                        )}
                      </div>
                      {e.reason && (
                        <p className="text-xs text-muted-foreground mt-1 italic">{e.reason}</p>
                      )}
                      <p className="text-xs text-muted-foreground mt-1">
                        Добавил: {e.added_by_name || '—'}
                        {e.added_at && ` · ${formatDateOnlyMSK(e.added_at)}`}
                      </p>
                    </div>
                    {isAdmin && (
                      <Button
                        size="sm"
                        variant="ghost"
                        className="text-destructive hover:text-destructive"
                        onClick={() => onRemoveTarget(e)}
                      >
                        <Icon name="Trash2" size={14} />
                      </Button>
                    )}
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </>
  );
};

export default ExceptionsTab;