import { useMemo, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import Icon from '@/components/ui/icon';
import { Input } from '@/components/ui/input';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
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

interface Status {
  id: number;
  name: string;
  color: string;
}

interface Priority {
  id: number;
  name: string;
  color: string;
}

interface SimpleUser {
  id: number;
  full_name?: string;
  username?: string;
  name?: string;
}

interface SimpleGroup {
  id: number;
  name: string;
}

interface BulkActionsBarProps {
  selectedCount: number;
  statuses: Status[];
  priorities: Priority[];
  users?: SimpleUser[];
  executorGroups?: SimpleGroup[];
  isAdmin?: boolean;
  onChangeStatus: (statusId: number) => Promise<void>;
  onChangePriority: (priorityId: number) => Promise<void>;
  onChangeExecutor?: (userId: number | null) => Promise<void>;
  onChangeExecutorGroup?: (groupId: number | null) => Promise<void>;
  onAddWatchers?: (userIds: number[]) => Promise<void>;
  onDelete: () => Promise<void>;
  onCancel: () => void;
}

const BulkActionsBar = ({
  selectedCount,
  statuses,
  priorities,
  users = [],
  executorGroups = [],
  isAdmin = false,
  onChangeStatus,
  onChangePriority,
  onChangeExecutor,
  onChangeExecutorGroup,
  onAddWatchers,
  onDelete,
  onCancel,
}: BulkActionsBarProps) => {
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [showExecutorDialog, setShowExecutorDialog] = useState(false);
  const [showGroupDialog, setShowGroupDialog] = useState(false);
  const [showWatchersDialog, setShowWatchersDialog] = useState(false);
  const [executorSearch, setExecutorSearch] = useState('');
  const [watcherSearch, setWatcherSearch] = useState('');
  const [selectedExecutorId, setSelectedExecutorId] = useState<number | null>(null);
  const [selectedGroupId, setSelectedGroupId] = useState<number | null>(null);
  const [selectedWatcherIds, setSelectedWatcherIds] = useState<number[]>([]);
  const [loading, setLoading] = useState(false);

  const userLabel = (u: SimpleUser) => u.full_name || u.name || u.username || `#${u.id}`;

  const filteredExecutorUsers = useMemo(() => {
    const q = executorSearch.trim().toLowerCase();
    if (!q) return users;
    return users.filter((u) => userLabel(u).toLowerCase().includes(q));
  }, [users, executorSearch]);

  const filteredWatcherUsers = useMemo(() => {
    const q = watcherSearch.trim().toLowerCase();
    if (!q) return users;
    return users.filter((u) => userLabel(u).toLowerCase().includes(q));
  }, [users, watcherSearch]);

  const handleStatusChange = async (value: string) => {
    setLoading(true);
    try {
      await onChangeStatus(parseInt(value));
    } finally {
      setLoading(false);
    }
  };

  const handlePriorityChange = async (value: string) => {
    setLoading(true);
    try {
      await onChangePriority(parseInt(value));
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async () => {
    setLoading(true);
    try {
      await onDelete();
      setShowDeleteDialog(false);
    } finally {
      setLoading(false);
    }
  };

  const handleApplyExecutor = async () => {
    if (!onChangeExecutor) return;
    setLoading(true);
    try {
      await onChangeExecutor(selectedExecutorId);
      setShowExecutorDialog(false);
      setSelectedExecutorId(null);
      setExecutorSearch('');
    } finally {
      setLoading(false);
    }
  };

  const handleApplyGroup = async () => {
    if (!onChangeExecutorGroup) return;
    setLoading(true);
    try {
      await onChangeExecutorGroup(selectedGroupId);
      setShowGroupDialog(false);
      setSelectedGroupId(null);
    } finally {
      setLoading(false);
    }
  };

  const handleApplyWatchers = async () => {
    if (!onAddWatchers) return;
    setLoading(true);
    try {
      await onAddWatchers(selectedWatcherIds);
      setShowWatchersDialog(false);
      setSelectedWatcherIds([]);
      setWatcherSearch('');
    } finally {
      setLoading(false);
    }
  };

  const toggleWatcher = (id: number) => {
    setSelectedWatcherIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    );
  };

  if (selectedCount === 0) return null;

  return (
    <>
      <div className="fixed bottom-4 sm:bottom-6 left-1/2 -translate-x-1/2 z-50 animate-in slide-in-from-bottom-4 w-[calc(100%-2rem)] sm:w-auto">
        <div className="bg-card border rounded-lg shadow-2xl p-3 sm:p-4 sm:min-w-[600px] max-w-[90vw]">
          <div className="flex flex-col sm:flex-row sm:items-center gap-3 sm:gap-4">
            <div className="flex items-center gap-2">
              <Badge variant="secondary" className="text-base px-3 py-1">
                {selectedCount}
              </Badge>
              <span className="text-sm font-medium">
                {selectedCount === 1 ? 'заявка выбрана' : 
                 selectedCount < 5 ? 'заявки выбраны' : 'заявок выбрано'}
              </span>
            </div>

            <div className="hidden sm:block h-6 w-px bg-border" />

            <div className="flex flex-col sm:flex-row sm:items-center gap-2 flex-1 w-full">
              <Select onValueChange={handleStatusChange} disabled={loading}>
                <SelectTrigger className="w-full sm:w-[180px] h-9 text-sm">
                  <SelectValue placeholder="Статус" />
                </SelectTrigger>
                <SelectContent>
                  {statuses.map((status) => (
                    <SelectItem key={status.id} value={status.id.toString()}>
                      <div className="flex items-center gap-2">
                        <div
                          className="w-2 h-2 rounded-full"
                          style={{ backgroundColor: status.color }}
                        />
                        {status.name}
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <Select onValueChange={handlePriorityChange} disabled={loading}>
                <SelectTrigger className="w-full sm:w-[180px] h-9 text-sm">
                  <SelectValue placeholder="Приоритет" />
                </SelectTrigger>
                <SelectContent>
                  {priorities.map((priority) => (
                    <SelectItem key={priority.id} value={priority.id.toString()}>
                      <div className="flex items-center gap-2">
                        <div
                          className="w-2 h-2 rounded-full"
                          style={{ backgroundColor: priority.color }}
                        />
                        {priority.name}
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              {isAdmin && onChangeExecutor && (
                <Button
                  variant="outline"
                  size="sm"
                  className="h-9 gap-2"
                  disabled={loading}
                  onClick={() => setShowExecutorDialog(true)}
                  title="Сменить исполнителя"
                >
                  <Icon name="UserCog" size={16} />
                  <span className="hidden sm:inline">Исполнитель</span>
                </Button>
              )}

              {isAdmin && onChangeExecutorGroup && (
                <Button
                  variant="outline"
                  size="sm"
                  className="h-9 gap-2"
                  disabled={loading}
                  onClick={() => setShowGroupDialog(true)}
                  title="Сменить группу исполнителей"
                >
                  <Icon name="Users" size={16} />
                  <span className="hidden sm:inline">Группа</span>
                </Button>
              )}

              {isAdmin && onAddWatchers && (
                <Button
                  variant="outline"
                  size="sm"
                  className="h-9 gap-2"
                  disabled={loading}
                  onClick={() => setShowWatchersDialog(true)}
                  title="Добавить наблюдателей"
                >
                  <Icon name="Eye" size={16} />
                  <span className="hidden sm:inline">Наблюдатели</span>
                </Button>
              )}

              <div className="flex items-center gap-2 sm:ml-auto">
                <Button
                  variant="destructive"
                  size="sm"
                  onClick={() => setShowDeleteDialog(true)}
                  disabled={loading}
                  className="flex-1 sm:flex-none"
                >
                  <Icon name="Trash2" size={16} className="sm:mr-2" />
                  <span className="hidden sm:inline">Удалить</span>
                </Button>

                <Button
                  variant="ghost"
                  size="sm"
                  onClick={onCancel}
                  disabled={loading}
                >
                  <Icon name="X" size={16} />
                </Button>
              </div>
            </div>
          </div>
        </div>
      </div>

      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Удалить заявки?</AlertDialogTitle>
            <AlertDialogDescription>
              Вы уверены, что хотите удалить {selectedCount}{' '}
              {selectedCount === 1 ? 'заявку' : selectedCount < 5 ? 'заявки' : 'заявок'}?
              Это действие необратимо.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={loading}>Отмена</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} disabled={loading}>
              {loading ? 'Удаление...' : 'Удалить'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <Dialog open={showExecutorDialog} onOpenChange={setShowExecutorDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Сменить исполнителя</DialogTitle>
            <DialogDescription>
              Назначить одного исполнителя для {selectedCount}{' '}
              {selectedCount === 1 ? 'заявки' : selectedCount < 5 ? 'заявок' : 'заявок'}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <Input
              placeholder="Поиск пользователя..."
              value={executorSearch}
              onChange={(e) => setExecutorSearch(e.target.value)}
            />
            <div className="max-h-[300px] overflow-y-auto border rounded-md divide-y">
              <button
                type="button"
                className={`w-full text-left px-3 py-2 text-sm hover:bg-accent ${
                  selectedExecutorId === null ? 'bg-accent' : ''
                }`}
                onClick={() => setSelectedExecutorId(null)}
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
                  onClick={() => setSelectedExecutorId(u.id)}
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
              onClick={() => setShowExecutorDialog(false)}
              disabled={loading}
            >
              Отмена
            </Button>
            <Button onClick={handleApplyExecutor} disabled={loading}>
              {loading ? 'Сохранение...' : 'Применить'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={showGroupDialog} onOpenChange={setShowGroupDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Сменить группу исполнителей</DialogTitle>
            <DialogDescription>
              Заменить группу для {selectedCount}{' '}
              {selectedCount === 1 ? 'заявки' : selectedCount < 5 ? 'заявок' : 'заявок'}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <div className="max-h-[300px] overflow-y-auto border rounded-md divide-y">
              <button
                type="button"
                className={`w-full text-left px-3 py-2 text-sm hover:bg-accent ${
                  selectedGroupId === null ? 'bg-accent' : ''
                }`}
                onClick={() => setSelectedGroupId(null)}
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
                  onClick={() => setSelectedGroupId(g.id)}
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
              onClick={() => setShowGroupDialog(false)}
              disabled={loading}
            >
              Отмена
            </Button>
            <Button onClick={handleApplyGroup} disabled={loading}>
              {loading ? 'Сохранение...' : 'Применить'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={showWatchersDialog} onOpenChange={setShowWatchersDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Добавить наблюдателей</DialogTitle>
            <DialogDescription>
              Выбранные пользователи будут добавлены к существующим наблюдателям {selectedCount}{' '}
              {selectedCount === 1 ? 'заявки' : selectedCount < 5 ? 'заявок' : 'заявок'}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <Input
              placeholder="Поиск пользователя..."
              value={watcherSearch}
              onChange={(e) => setWatcherSearch(e.target.value)}
            />
            <div className="max-h-[300px] overflow-y-auto border rounded-md divide-y">
              {filteredWatcherUsers.map((u) => {
                const checked = selectedWatcherIds.includes(u.id);
                return (
                  <label
                    key={u.id}
                    className="flex items-center gap-2 px-3 py-2 text-sm hover:bg-accent cursor-pointer"
                  >
                    <Checkbox checked={checked} onCheckedChange={() => toggleWatcher(u.id)} />
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
              onClick={() => setShowWatchersDialog(false)}
              disabled={loading}
            >
              Отмена
            </Button>
            <Button
              onClick={handleApplyWatchers}
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

export default BulkActionsBar;