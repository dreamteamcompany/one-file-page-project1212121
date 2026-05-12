import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Checkbox } from '@/components/ui/checkbox';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { SimpleUser, SimpleGroup, userLabel } from './BulkActionsBarTypes';

interface BulkActionsBarDialogsProps {
  selectedCount: number;
  loading: boolean;

  showDeleteDialog: boolean;
  onCloseDeleteDialog: (open: boolean) => void;
  onConfirmDelete: () => void;

  showExecutorDialog: boolean;
  onCloseExecutorDialog: (open: boolean) => void;
  executorSearch: string;
  onExecutorSearchChange: (value: string) => void;
  filteredExecutorUsers: SimpleUser[];
  selectedExecutorId: number | null;
  onSelectExecutor: (id: number | null) => void;
  onApplyExecutor: () => void;

  showGroupDialog: boolean;
  onCloseGroupDialog: (open: boolean) => void;
  executorGroups: SimpleGroup[];
  selectedGroupId: number | null;
  onSelectGroup: (id: number | null) => void;
  onApplyGroup: () => void;

  showWatchersDialog: boolean;
  onCloseWatchersDialog: (open: boolean) => void;
  watcherSearch: string;
  onWatcherSearchChange: (value: string) => void;
  filteredWatcherUsers: SimpleUser[];
  selectedWatcherIds: number[];
  onToggleWatcher: (id: number) => void;
  onApplyWatchers: () => void;
}

const BulkActionsBarDialogs = ({
  selectedCount,
  loading,

  showDeleteDialog,
  onCloseDeleteDialog,
  onConfirmDelete,

  showExecutorDialog,
  onCloseExecutorDialog,
  executorSearch,
  onExecutorSearchChange,
  filteredExecutorUsers,
  selectedExecutorId,
  onSelectExecutor,
  onApplyExecutor,

  showGroupDialog,
  onCloseGroupDialog,
  executorGroups,
  selectedGroupId,
  onSelectGroup,
  onApplyGroup,

  showWatchersDialog,
  onCloseWatchersDialog,
  watcherSearch,
  onWatcherSearchChange,
  filteredWatcherUsers,
  selectedWatcherIds,
  onToggleWatcher,
  onApplyWatchers,
}: BulkActionsBarDialogsProps) => {
  const countWord = selectedCount === 1 ? 'заявки' : selectedCount < 5 ? 'заявок' : 'заявок';
  const countWordAccusative = selectedCount === 1 ? 'заявку' : selectedCount < 5 ? 'заявки' : 'заявок';

  return (
    <>
      <AlertDialog open={showDeleteDialog} onOpenChange={onCloseDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Удалить заявки?</AlertDialogTitle>
            <AlertDialogDescription>
              Вы уверены, что хотите удалить {selectedCount}{' '}
              {countWordAccusative}?
              Это действие необратимо.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={loading}>Отмена</AlertDialogCancel>
            <AlertDialogAction onClick={onConfirmDelete} disabled={loading}>
              {loading ? 'Удаление...' : 'Удалить'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <Dialog open={showExecutorDialog} onOpenChange={onCloseExecutorDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Сменить исполнителя</DialogTitle>
            <DialogDescription>
              Назначить одного исполнителя для {selectedCount}{' '}
              {countWord}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <Input
              placeholder="Поиск пользователя..."
              value={executorSearch}
              onChange={(e) => onExecutorSearchChange(e.target.value)}
            />
            <div className="max-h-[300px] overflow-y-auto border rounded-md divide-y">
              <button
                type="button"
                className={`w-full text-left px-3 py-2 text-sm hover:bg-accent ${
                  selectedExecutorId === null ? 'bg-accent' : ''
                }`}
                onClick={() => onSelectExecutor(null)}
              >
                <span className="text-muted-foreground">— Снять исполнителя —</span>
              </button>
              {filteredExecutorUsers.map((u) => (
                <button
                  key={u.id}
                  type="button"
                  className={`w-full text-left px-3 py-2 text-sm hover:bg-accent ${
                    selectedExecutorId === u.id ? 'bg-accent' : ''
                  }`}
                  onClick={() => onSelectExecutor(u.id)}
                >
                  {userLabel(u)}
                </button>
              ))}
              {filteredExecutorUsers.length === 0 && (
                <div className="px-3 py-4 text-sm text-muted-foreground text-center">
                  Ничего не найдено
                </div>
              )}
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => onCloseExecutorDialog(false)}
              disabled={loading}
            >
              Отмена
            </Button>
            <Button onClick={onApplyExecutor} disabled={loading}>
              {loading ? 'Сохранение...' : 'Применить'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={showGroupDialog} onOpenChange={onCloseGroupDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Сменить группу исполнителей</DialogTitle>
            <DialogDescription>
              Заменить группу для {selectedCount}{' '}
              {countWord}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <div className="max-h-[300px] overflow-y-auto border rounded-md divide-y">
              <button
                type="button"
                className={`w-full text-left px-3 py-2 text-sm hover:bg-accent ${
                  selectedGroupId === null ? 'bg-accent' : ''
                }`}
                onClick={() => onSelectGroup(null)}
              >
                <span className="text-muted-foreground">— Снять группу —</span>
              </button>
              {executorGroups.map((g) => (
                <button
                  key={g.id}
                  type="button"
                  className={`w-full text-left px-3 py-2 text-sm hover:bg-accent ${
                    selectedGroupId === g.id ? 'bg-accent' : ''
                  }`}
                  onClick={() => onSelectGroup(g.id)}
                >
                  {g.name}
                </button>
              ))}
              {executorGroups.length === 0 && (
                <div className="px-3 py-4 text-sm text-muted-foreground text-center">
                  Группы не найдены
                </div>
              )}
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => onCloseGroupDialog(false)}
              disabled={loading}
            >
              Отмена
            </Button>
            <Button onClick={onApplyGroup} disabled={loading}>
              {loading ? 'Сохранение...' : 'Применить'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={showWatchersDialog} onOpenChange={onCloseWatchersDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Добавить наблюдателей</DialogTitle>
            <DialogDescription>
              Выбранные пользователи будут добавлены к существующим наблюдателям {selectedCount}{' '}
              {countWord}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <Input
              placeholder="Поиск пользователя..."
              value={watcherSearch}
              onChange={(e) => onWatcherSearchChange(e.target.value)}
            />
            <div className="max-h-[300px] overflow-y-auto border rounded-md divide-y">
              {filteredWatcherUsers.map((u) => {
                const checked = selectedWatcherIds.includes(u.id);
                return (
                  <label
                    key={u.id}
                    className="flex items-center gap-2 px-3 py-2 text-sm hover:bg-accent cursor-pointer"
                  >
                    <Checkbox checked={checked} onCheckedChange={() => onToggleWatcher(u.id)} />
                    <span>{userLabel(u)}</span>
                  </label>
                );
              })}
              {filteredWatcherUsers.length === 0 && (
                <div className="px-3 py-4 text-sm text-muted-foreground text-center">
                  Ничего не найдено
                </div>
              )}
            </div>
            {selectedWatcherIds.length > 0 && (
              <div className="text-xs text-muted-foreground">
                Выбрано: {selectedWatcherIds.length}
              </div>
            )}
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => onCloseWatchersDialog(false)}
              disabled={loading}
            >
              Отмена
            </Button>
            <Button
              onClick={onApplyWatchers}
              disabled={loading || selectedWatcherIds.length === 0}
            >
              {loading ? 'Сохранение...' : 'Добавить'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
};

export default BulkActionsBarDialogs;
