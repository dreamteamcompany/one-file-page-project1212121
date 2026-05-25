import { Dispatch, SetStateAction } from 'react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import Icon from '@/components/ui/icon';
import { BitrixSearchUser } from './types';

interface AddExceptionDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  bxQuery: string;
  setBxQuery: Dispatch<SetStateAction<string>>;
  bxResults: BitrixSearchUser[];
  bxSearching: boolean;
  selectedBx: BitrixSearchUser | null;
  setSelectedBx: Dispatch<SetStateAction<BitrixSearchUser | null>>;
  reason: string;
  setReason: Dispatch<SetStateAction<string>>;
  savingException: boolean;
  onSave: () => void;
}

const AddExceptionDialog = ({
  open,
  onOpenChange,
  bxQuery,
  setBxQuery,
  bxResults,
  bxSearching,
  selectedBx,
  setSelectedBx,
  reason,
  setReason,
  savingException,
  onSave,
}: AddExceptionDialogProps) => {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Добавить в исключения</DialogTitle>
          <DialogDescription>
            Найдите сотрудника в Битрикс24 и добавьте его в список исключений.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-3">
          <div className="relative">
            <Icon
              name="Search"
              size={16}
              className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground"
            />
            <Input
              placeholder="Начните вводить фамилию, имя, email..."
              value={bxQuery}
              onChange={e => setBxQuery(e.target.value)}
              className="pl-9 pr-9"
              autoFocus
            />
            {bxSearching && (
              <Icon
                name="Loader2"
                size={16}
                className="absolute right-3 top-1/2 -translate-y-1/2 animate-spin text-muted-foreground"
              />
            )}
          </div>

          <div className="max-h-60 overflow-y-auto border rounded-md min-h-[60px]">
            {bxQuery.trim().length < 2 ? (
              <div className="p-4 text-center text-sm text-muted-foreground">
                Введите минимум 2 символа для поиска
              </div>
            ) : bxSearching && bxResults.length === 0 ? (
              <div className="p-4 text-center text-sm text-muted-foreground">
                Идёт поиск...
              </div>
            ) : bxResults.length === 0 ? (
              <div className="p-4 text-center text-sm text-muted-foreground">
                Никого не нашли
              </div>
            ) : (
              <div className="divide-y">
                {bxResults.map(u => (
                  <button
                    key={u.id}
                    type="button"
                    onClick={() => !u.already_excluded && setSelectedBx(u)}
                    disabled={u.already_excluded}
                    className={`w-full text-left p-2 text-sm hover:bg-muted/50 transition-colors ${
                      selectedBx?.id === u.id ? 'bg-primary/10' : ''
                    } ${u.already_excluded ? 'opacity-50 cursor-not-allowed' : ''}`}
                  >
                    <div className="font-medium">{u.name}</div>
                    <div className="text-xs text-muted-foreground flex flex-wrap gap-2 items-center">
                      {u.email && <span>{u.email}</span>}
                      {u.position && <span>· {u.position}</span>}
                      {u.already_excluded && <Badge variant="secondary" className="text-xs">Уже в исключениях</Badge>}
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>

          {selectedBx && (
            <div className="p-3 rounded-md bg-muted/40 border">
              <p className="text-xs text-muted-foreground mb-1">Выбран:</p>
              <p className="font-medium text-sm">{selectedBx.name}</p>
            </div>
          )}

          <div>
            <label className="text-xs text-muted-foreground mb-1 block">Причина (необязательно)</label>
            <Textarea
              value={reason}
              onChange={e => setReason(e.target.value)}
              placeholder="Например: в декрете, удалённый сотрудник, директор..."
              rows={3}
            />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Отмена</Button>
          <Button onClick={onSave} disabled={!selectedBx || savingException}>
            {savingException ? <Icon name="Loader2" size={16} className="animate-spin mr-2" /> : null}
            Добавить
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default AddExceptionDialog;
