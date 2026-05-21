import { useState, useMemo } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import Icon from '@/components/ui/icon';
import { SLAItem, formatTime } from './types';

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  slas: SLAItem[];
  onCopy: (slaId: number) => Promise<void>;
}

const SlaCopyDialog = ({ open, onOpenChange, slas, onCopy }: Props) => {
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [search, setSearch] = useState('');
  const [copying, setCopying] = useState(false);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return slas;
    return slas.filter((s) => s.name.toLowerCase().includes(q));
  }, [slas, search]);

  const handleConfirm = async () => {
    if (!selectedId) return;
    setCopying(true);
    try {
      await onCopy(selectedId);
      setSelectedId(null);
      setSearch('');
      onOpenChange(false);
    } finally {
      setCopying(false);
    }
  };

  const handleClose = (next: boolean) => {
    if (copying) return;
    if (!next) {
      setSelectedId(null);
      setSearch('');
    }
    onOpenChange(next);
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Icon name="Copy" size={18} />
            Копировать SLA
          </DialogTitle>
          <DialogDescription>
            Выберите SLA — будет создан полный дубль с приоритетами и бюджетами групп.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3">
          <div className="relative">
            <Icon
              name="Search"
              size={14}
              className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground"
            />
            <Input
              placeholder="Поиск по названию"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9 h-9"
            />
          </div>

          <div className="max-h-[320px] overflow-y-auto rounded-lg border border-border divide-y divide-border/40">
            {filtered.length === 0 ? (
              <div className="p-6 text-center text-sm text-muted-foreground">
                Ничего не найдено
              </div>
            ) : (
              filtered.map((sla) => {
                const isSelected = selectedId === sla.id;
                return (
                  <button
                    key={sla.id}
                    type="button"
                    onClick={() => setSelectedId(sla.id)}
                    className={`w-full flex items-center gap-3 p-2.5 text-left transition-colors ${
                      isSelected ? 'bg-primary/10' : 'hover:bg-muted/40'
                    }`}
                  >
                    <div
                      className={`w-4 h-4 rounded-full border-2 flex items-center justify-center shrink-0 ${
                        isSelected ? 'border-primary' : 'border-muted-foreground/40'
                      }`}
                    >
                      {isSelected && (
                        <div className="w-2 h-2 rounded-full bg-primary" />
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-medium truncate">{sla.name}</div>
                      <div className="flex items-center gap-3 text-[11px] text-muted-foreground mt-0.5">
                        <span className="flex items-center gap-1">
                          <Icon name="Timer" size={11} className="text-primary" />
                          {formatTime(sla.response_time_minutes)}
                        </span>
                        <span className="flex items-center gap-1">
                          <Icon name="CheckCircle2" size={11} className="text-green-500" />
                          {formatTime(sla.resolution_time_minutes)}
                        </span>
                        {sla.priority_times && sla.priority_times.length > 0 && (
                          <span className="flex items-center gap-1 text-purple-500">
                            <Icon name="Layers" size={11} />
                            {sla.priority_times.length}
                          </span>
                        )}
                      </div>
                    </div>
                  </button>
                );
              })
            )}
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => handleClose(false)} disabled={copying}>
            Отмена
          </Button>
          <Button onClick={handleConfirm} disabled={!selectedId || copying}>
            {copying ? (
              <>
                <Icon name="Loader2" size={16} className="mr-2 animate-spin" />
                Копирование...
              </>
            ) : (
              <>
                <Icon name="Copy" size={16} className="mr-2" />
                Создать копию
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default SlaCopyDialog;
