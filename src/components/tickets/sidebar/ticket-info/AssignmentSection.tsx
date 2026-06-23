import { useState, useMemo } from 'react';
import Icon from '@/components/ui/icon';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Ticket, User, ExecutorGroup } from './types';

interface AssignmentSectionProps {
  ticket: Ticket;
  users: User[];
  updating: boolean;
  executorGroups: ExecutorGroup[];
  canSeeGroup: boolean;
  canAssignExecutor: boolean;
  onAssignUser: (userId: string) => void;
  onAssignGroup?: (groupId: string) => void;
}

const AssignmentSection = ({
  ticket,
  users,
  updating,
  executorGroups,
  canSeeGroup,
  canAssignExecutor,
  onAssignUser,
  onAssignGroup,
}: AssignmentSectionProps) => {
  const [userSearch, setUserSearch] = useState('');
  const currentGroupInList =
    ticket.executor_group_id != null &&
    executorGroups.some((g) => g.id === ticket.executor_group_id);
  const groupOptions =
    ticket.executor_group_id != null && !currentGroupInList
      ? [
          {
            id: ticket.executor_group_id,
            name: ticket.executor_group_name || 'Текущая группа',
            disabled: true,
          } as ExecutorGroup & { disabled?: boolean },
          ...executorGroups,
        ]
      : executorGroups;

  const currentAssigneeInList =
    ticket.assigned_to != null &&
    users.some((u) => u.id === ticket.assigned_to);
  const userOptions =
    ticket.assigned_to != null && !currentAssigneeInList
      ? [
          {
            id: ticket.assigned_to,
            name: ticket.assignee_name || 'Текущий исполнитель',
            email: '',
            role: '',
            photo_url: ticket.assignee_photo_url,
            disabled: true,
          } as User & { disabled?: boolean },
          ...users,
        ]
      : users;

  const filteredUserOptions = useMemo(() => {
    const q = userSearch.trim().toLowerCase();
    if (!q) return userOptions;
    return userOptions.filter(
      (u) =>
        u.id === ticket.assigned_to ||
        (u.name || '').toLowerCase().includes(q) ||
        (u.email || '').toLowerCase().includes(q),
    );
  }, [userOptions, userSearch, ticket.assigned_to]);

  return (
    <>
      {canSeeGroup && onAssignGroup && (
        <div className="p-4">
          <h3 className="text-xs font-semibold mb-3 text-foreground uppercase tracking-wide flex items-center gap-2">
            <Icon name="Users" size={14} />
            Группа исполнителей
          </h3>
          <Select
            value={ticket.executor_group_id?.toString() || 'unassign'}
            onValueChange={onAssignGroup}
            disabled={updating}
          >
            <SelectTrigger>
              <SelectValue placeholder="Выберите группу" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="unassign">
                <div className="flex items-center gap-2 text-muted-foreground">
                  <Icon name="Users" size={14} />
                  Не назначена
                </div>
              </SelectItem>
              {groupOptions.map((group) => (
                <SelectItem
                  key={group.id}
                  value={group.id.toString()}
                  disabled={(group as { disabled?: boolean }).disabled}
                >
                  <div className="flex items-center gap-2">
                    <div className="w-6 h-6 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                      <Icon name="Users" size={12} className="text-primary" />
                    </div>
                    <span className="text-sm">{group.name}</span>
                  </div>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      )}

      <div className="p-4">
        <h3 className="text-xs font-semibold mb-3 text-foreground uppercase tracking-wide flex items-center gap-2">
          <Icon name="UserCheck" size={14} />
          Исполнитель
        </h3>
        {canAssignExecutor ? (
          <Select
            value={ticket.assigned_to?.toString() || 'unassign'}
            onValueChange={onAssignUser}
            disabled={updating}
            onOpenChange={(open) => { if (!open) setUserSearch(''); }}
          >
            <SelectTrigger>
              <SelectValue placeholder="Выберите исполнителя" />
            </SelectTrigger>
            <SelectContent>
              <div className="sticky top-0 z-10 bg-popover p-2 pb-1.5" onKeyDown={(e) => e.stopPropagation()}>
                <div className="relative">
                  <Icon name="Search" size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    autoFocus
                    value={userSearch}
                    onChange={(e) => setUserSearch(e.target.value)}
                    placeholder="Поиск исполнителя..."
                    className="h-8 pl-8 text-sm"
                  />
                </div>
              </div>
              <SelectItem value="unassign">
                <div className="flex items-center gap-2 text-muted-foreground">
                  <Icon name="UserX" size={14} />
                  Не назначен
                </div>
              </SelectItem>
              {filteredUserOptions.length === 0 && (
                <div className="px-2 py-3 text-sm text-muted-foreground text-center">Ничего не найдено</div>
              )}
              {filteredUserOptions.map((u) => (
                <SelectItem
                  key={u.id}
                  value={u.id.toString()}
                  disabled={(u as { disabled?: boolean }).disabled}
                >
                  <div className="flex items-center gap-2">
                    {u.photo_url ? (
                      <img src={u.photo_url} alt={u.name} className="w-6 h-6 rounded-full object-cover flex-shrink-0" />
                    ) : (
                      <div className="w-6 h-6 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                        <Icon name="User" size={12} className="text-primary" />
                      </div>
                    )}
                    <span className="text-sm">{u.name}</span>
                  </div>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        ) : (
          <div className="flex items-center gap-2 text-sm">
            {ticket.assignee_name ? (
              <>
                {ticket.assignee_photo_url ? (
                  <img src={ticket.assignee_photo_url} alt={ticket.assignee_name} className="w-7 h-7 rounded-full object-cover flex-shrink-0" />
                ) : (
                  <div className="w-7 h-7 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                    <Icon name="User" size={14} className="text-primary" />
                  </div>
                )}
                <span className="font-medium">{ticket.assignee_name}</span>
              </>
            ) : (
              <span className="text-muted-foreground">Не назначен</span>
            )}
          </div>
        )}
      </div>
    </>
  );
};

export default AssignmentSection;