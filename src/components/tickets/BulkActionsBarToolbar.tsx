import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import Icon from '@/components/ui/icon';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Status, Priority } from './BulkActionsBarTypes';

interface BulkActionsBarToolbarProps {
  selectedCount: number;
  statuses: Status[];
  priorities: Priority[];
  isAdmin: boolean;
  loading: boolean;
  hasExecutor: boolean;
  hasGroup: boolean;
  hasWatchers: boolean;
  onStatusChange: (value: string) => void;
  onPriorityChange: (value: string) => void;
  onOpenExecutorDialog: () => void;
  onOpenGroupDialog: () => void;
  onOpenWatchersDialog: () => void;
  onOpenDeleteDialog: () => void;
  onCancel: () => void;
}

const BulkActionsBarToolbar = ({
  selectedCount,
  statuses,
  priorities,
  isAdmin,
  loading,
  hasExecutor,
  hasGroup,
  hasWatchers,
  onStatusChange,
  onPriorityChange,
  onOpenExecutorDialog,
  onOpenGroupDialog,
  onOpenWatchersDialog,
  onOpenDeleteDialog,
  onCancel,
}: BulkActionsBarToolbarProps) => {
  return (
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
            <Select onValueChange={onStatusChange} disabled={loading}>
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

            <Select onValueChange={onPriorityChange} disabled={loading}>
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

            {isAdmin && hasExecutor && (
              <Button
                variant="outline"
                size="sm"
                className="h-9 gap-2"
                disabled={loading}
                onClick={onOpenExecutorDialog}
                title="Сменить исполнителя"
              >
                <Icon name="UserCog" size={16} />
                <span className="hidden sm:inline">Исполнитель</span>
              </Button>
            )}

            {isAdmin && hasGroup && (
              <Button
                variant="outline"
                size="sm"
                className="h-9 gap-2"
                disabled={loading}
                onClick={onOpenGroupDialog}
                title="Сменить группу исполнителей"
              >
                <Icon name="Users" size={16} />
                <span className="hidden sm:inline">Группа</span>
              </Button>
            )}

            {isAdmin && hasWatchers && (
              <Button
                variant="outline"
                size="sm"
                className="h-9 gap-2"
                disabled={loading}
                onClick={onOpenWatchersDialog}
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
                onClick={onOpenDeleteDialog}
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
  );
};

export default BulkActionsBarToolbar;
