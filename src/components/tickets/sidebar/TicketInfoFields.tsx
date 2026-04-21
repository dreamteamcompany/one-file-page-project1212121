import { Badge } from '@/components/ui/badge';
import Icon from '@/components/ui/icon';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useAuth } from '@/contexts/AuthContext';
import { getDeadlineInfo } from './ticket-info/types';
import type { Ticket, Status, User, ExecutorGroup } from './ticket-info/types';
import DeadlineSection from './ticket-info/DeadlineSection';
import AssignmentSection from './ticket-info/AssignmentSection';
import WaitingToggleButton from './WaitingToggleButton';

interface TicketInfoFieldsProps {
  ticket: Ticket;
  statuses: Status[];
  users: User[];
  updating: boolean;
  isCustomer?: boolean;
  executorGroups?: ExecutorGroup[];
  onStatusChange: (statusId: string) => void;
  onAssignUser: (userId: string) => void;
  onAssignGroup?: (groupId: string) => void;
  onUpdateDueDate?: (dueDate: string | null) => void;
}

const TicketInfoFields = ({
  ticket,
  statuses,
  users,
  updating,
  isCustomer = false,
  executorGroups = [],
  onStatusChange,
  onAssignUser,
  onAssignGroup,
  onUpdateDueDate,
}: TicketInfoFieldsProps) => {
  const { hasPermission, hasSystemRole } = useAuth();
  const canSeeGroup = hasSystemRole('admin', 'executor');
  const canAssignExecutor = hasPermission('tickets', 'assign_executor');
  const canEditDueDate = hasPermission('tickets', 'update') || hasSystemRole('admin');

  const deadlineInfo = getDeadlineInfo(ticket.due_date);
  const responseDeadlineInfo = getDeadlineInfo(ticket.response_due_date);

  return (
    <div className="rounded-lg bg-card border divide-y">
      {ticket.priority_name && (
        <div className="p-4">
          <h3 className="text-xs font-semibold mb-3 text-foreground uppercase tracking-wide flex items-center gap-2">
            <Icon name="Flag" size={14} />
            Приоритет
          </h3>
          <div className="flex items-center gap-2">
            <Badge
              style={{ 
                backgroundColor: `${ticket.priority_color}20`,
                color: ticket.priority_color,
                borderColor: ticket.priority_color
              }}
              className="border"
            >
              {ticket.priority_name}
            </Badge>
          </div>
        </div>
      )}

      <div className="p-4">
        <h3 className="text-xs font-semibold mb-3 text-foreground uppercase tracking-wide flex items-center gap-2">
          <Icon name="CheckCircle" size={14} />
          Статус
        </h3>
        <Select
          value={ticket.status_id?.toString()}
          onValueChange={onStatusChange}
          disabled={updating}
        >
          <SelectTrigger>
            <SelectValue placeholder="Выберите статус" />
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

        {!isCustomer && (
          <WaitingToggleButton
            ticket={ticket as unknown as { id: number; status_id?: number; previous_status_id?: number | null; created_by: number }}
            statuses={statuses}
            updating={updating}
            onStatusChange={onStatusChange}
            className="w-full mt-2"
          />
        )}
      </div>

      <DeadlineSection
        ticket={ticket}
        deadlineInfo={deadlineInfo}
        responseDeadlineInfo={responseDeadlineInfo}
        isCustomer={isCustomer}
        canEditDueDate={canEditDueDate}
        onUpdateDueDate={onUpdateDueDate}
      />

      <AssignmentSection
        ticket={ticket}
        users={users}
        updating={updating}
        executorGroups={executorGroups}
        canSeeGroup={canSeeGroup}
        canAssignExecutor={canAssignExecutor}
        onAssignUser={onAssignUser}
        onAssignGroup={onAssignGroup}
      />

      {ticket.category_name && (
        <div className="p-4">
          <h3 className="text-xs font-semibold mb-3 text-foreground uppercase tracking-wide flex items-center gap-2">
            <Icon name="Tag" size={14} />
            Категория
          </h3>
          <div className="flex items-center gap-2">
            {ticket.category_icon && (
              <Icon name={ticket.category_icon} size={14} className="text-primary" />
            )}
            <p className="text-sm">{ticket.category_name}</p>
          </div>
        </div>
      )}

      {ticket.department_name && (
        <div className="p-4">
          <h3 className="text-xs font-semibold mb-3 text-foreground uppercase tracking-wide flex items-center gap-2">
            <Icon name="Building2" size={14} />
            Департамент
          </h3>
          <p className="text-sm">{ticket.department_name}</p>
        </div>
      )}
    </div>
  );
};

export default TicketInfoFields;