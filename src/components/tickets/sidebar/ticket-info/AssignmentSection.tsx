import Icon from '@/components/ui/icon';
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
              {executorGroups.map((group) => (
                <SelectItem key={group.id} value={group.id.toString()}>
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
          >
            <SelectTrigger>
              <SelectValue placeholder="Выберите исполнителя" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="unassign">
                <div className="flex items-center gap-2 text-muted-foreground">
                  <Icon name="UserX" size={14} />
                  Не назначен
                </div>
              </SelectItem>
              {users.map((u) => (
                <SelectItem key={u.id} value={u.id.toString()}>
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
