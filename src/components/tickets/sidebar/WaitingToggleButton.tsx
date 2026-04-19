import { Button } from '@/components/ui/button';
import Icon from '@/components/ui/icon';
import { useAuth } from '@/contexts/AuthContext';

interface Status {
  id: number;
  name: string;
  color: string;
  is_closed: boolean;
  is_approval?: boolean;
  is_waiting_response?: boolean;
  order?: number;
}

interface Ticket {
  id: number;
  status_id?: number;
  previous_status_id?: number | null;
  created_by: number;
}

interface WaitingToggleButtonProps {
  ticket: Ticket;
  statuses: Status[];
  updating: boolean;
  onStatusChange: (statusId: string) => void;
  className?: string;
}

const WaitingToggleButton = ({
  ticket,
  statuses,
  updating,
  onStatusChange,
  className = '',
}: WaitingToggleButtonProps) => {
  const { user, hasPermission } = useAuth();

  const isCustomer = ticket.created_by === user?.id;
  const canChangeStatus = hasPermission('tickets', 'update');
  const currentStatus = statuses.find((s) => s.id === ticket.status_id);
  const isWaiting = !!currentStatus?.is_waiting_response;

  const waitingStatus = [...statuses]
    .filter((s) => s.is_waiting_response)
    .sort((a, b) => (a.order ?? 0) - (b.order ?? 0) || a.id - b.id)[0];

  const resumeStatusId =
    ticket.previous_status_id ??
    [...statuses]
      .filter((s) => !s.is_waiting_response && !s.is_closed && !s.is_approval)
      .sort((a, b) => (a.order ?? 0) - (b.order ?? 0) || a.id - b.id)[0]?.id;

  const canToggleWaiting = canChangeStatus && !isCustomer && !currentStatus?.is_closed;
  if (!canToggleWaiting) return null;
  if (!waitingStatus && !isWaiting) return null;

  const handleClick = () => {
    if (isWaiting) {
      if (resumeStatusId) onStatusChange(resumeStatusId.toString());
    } else if (waitingStatus) {
      onStatusChange(waitingStatus.id.toString());
    }
  };

  return (
    <Button
      variant={isWaiting ? 'default' : 'outline'}
      size="sm"
      className={`flex items-center gap-2 ${className}`}
      onClick={handleClick}
      disabled={updating || (isWaiting && !resumeStatusId)}
    >
      <Icon name={isWaiting ? 'PlayCircle' : 'PauseCircle'} size={14} />
      {isWaiting ? 'Вернуть в работу' : 'Ждать ответа клиента'}
    </Button>
  );
};

export default WaitingToggleButton;
