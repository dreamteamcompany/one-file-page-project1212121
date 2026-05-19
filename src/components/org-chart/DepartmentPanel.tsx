import { useDraggable } from '@dnd-kit/core';
import { CSS } from '@dnd-kit/utilities';
import Icon from '@/components/ui/icon';
import { Button } from '@/components/ui/button';
import { Department, DepartmentUser } from './types';
import { cn } from '@/lib/utils';

interface Props {
  data: {
    department: Department;
    head: DepartmentUser | null;
    members: DepartmentUser[];
  };
  isAdmin: boolean;
  onClose: () => void;
  onEditDept: () => void;
}

const DraggableUser = ({ user, isAdmin }: { user: DepartmentUser; isAdmin: boolean }) => {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
    id: `user-${user.id}`,
    data: { user },
    disabled: !isAdmin,
  });

  const style = transform
    ? { transform: CSS.Translate.toString(transform), opacity: isDragging ? 0.3 : 1 }
    : { opacity: isDragging ? 0.3 : 1 };

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...listeners}
      {...attributes}
      className={cn(
        'flex items-center gap-3 p-2 rounded-md hover:bg-accent transition-colors',
        isAdmin && 'cursor-grab active:cursor-grabbing',
      )}
    >
      {user.photo_url ? (
        <img
          src={user.photo_url}
          alt=""
          className="w-9 h-9 rounded-full object-cover flex-shrink-0"
        />
      ) : (
        <div className="w-9 h-9 rounded-full bg-muted flex items-center justify-center flex-shrink-0">
          <Icon name="User" size={16} />
        </div>
      )}
      <div className="min-w-0 flex-1">
        <div className="text-sm font-medium truncate">{user.full_name}</div>
        <div className="text-xs text-muted-foreground truncate">{user.position || '—'}</div>
      </div>
      {isAdmin && (
        <Icon name="GripVertical" size={14} className="text-muted-foreground/50 flex-shrink-0" />
      )}
    </div>
  );
};

const DepartmentPanel = ({ data, isAdmin, onClose, onEditDept }: Props) => {
  const { department, head, members } = data;
  const subordinates = members.filter((m) => m.id !== head?.id);

  return (
    <div className="w-80 flex flex-col border rounded-lg bg-card overflow-hidden">
      {/* Шапка */}
      <div className="p-3 border-b flex items-start justify-between gap-2">
        <div className="min-w-0">
          <div className="font-semibold text-sm truncate" title={department.name}>
            {department.name}
          </div>
          <div className="text-xs text-muted-foreground mt-0.5">
            Сотрудников: {members.length}
          </div>
        </div>
        <div className="flex items-center gap-1">
          {isAdmin && (
            <button
              type="button"
              onClick={onEditDept}
              className="p-1.5 rounded hover:bg-accent"
              title="Редактировать"
            >
              <Icon name="Pencil" size={14} />
            </button>
          )}
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded hover:bg-accent"
            title="Закрыть"
          >
            <Icon name="X" size={14} />
          </button>
        </div>
      </div>

      {/* Содержимое */}
      <div className="flex-1 overflow-y-auto">
        {head && (
          <div className="px-3 pt-3">
            <div className="text-[11px] uppercase tracking-wide text-muted-foreground mb-2 font-medium">
              Руководитель
            </div>
            <DraggableUser user={head} isAdmin={isAdmin} />
          </div>
        )}

        <div className="px-3 py-3">
          <div className="text-[11px] uppercase tracking-wide text-muted-foreground mb-2 font-medium">
            Сотрудники ({subordinates.length})
          </div>
          {subordinates.length === 0 ? (
            <div className="text-xs text-muted-foreground italic text-center py-4">
              Сотрудников нет
              {isAdmin && (
                <div className="mt-1 text-[11px]">Перетащите сюда из другого отдела</div>
              )}
            </div>
          ) : (
            <div className="space-y-1">
              {subordinates.map((u) => (
                <DraggableUser key={u.id} user={u} isAdmin={isAdmin} />
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default DepartmentPanel;
