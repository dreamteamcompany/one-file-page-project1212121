import { useState } from 'react';
import TicketApprovalBlock from './TicketApprovalBlock';
import TicketConfirmationBlock from './TicketConfirmationBlock';
import TicketTimerCard from './sidebar/TicketTimerCard';
import TicketPingCard from './sidebar/TicketPingCard';
import TicketInfoFields from './sidebar/TicketInfoFields';
import ApprovalDialog from './sidebar/ApprovalDialog';

interface User {
  id: number;
  name: string;
  email: string;
  role: string;
}

interface Status {
  id: number;
  name: string;
  color: string;
  is_closed: boolean;
  is_approval?: boolean;
  is_pending_confirmation?: boolean;
}

interface Ticket {
  id: number;
  title: string;
  description?: string;
  category_name?: string;
  category_icon?: string;
  priority_id?: number;
  priority_name?: string;
  priority_color?: string;
  status_id?: number;
  status_name?: string;
  status_color?: string;
  department_name?: string;
  created_by: number;
  creator_name?: string;
  creator_email?: string;
  assigned_to?: number;
  assignee_name?: string;
  assignee_email?: string;
  due_date?: string;
  created_at?: string;
  updated_at?: string;
  closed_at?: string;
  confirmation_sent_at?: string;
  rating?: number;
  rejection_reason?: string;
  ticket_service?: {
    id: number;
    name: string;
  };
  services?: Array<{
    id: number;
    name: string;
    category_name?: string;
  }>;
}

interface TicketDetailsSidebarProps {
  ticket: Ticket;
  statuses: Status[];
  users: User[];
  updating: boolean;
  sendingPing?: boolean;
  isCustomer?: boolean;
  hasAssignee?: boolean;
  onUpdateStatus: (statusId: string) => void;
  onAssignUser: (userId: string) => void;
  onSendPing?: () => void;
  onApprovalChange?: () => void;
  onUpdateDueDate?: (dueDate: string | null) => void;
  hidePing?: boolean;
}

const TicketDetailsSidebar = ({
  ticket,
  statuses,
  users,
  updating,
  sendingPing = false,
  isCustomer = false,
  hasAssignee = false,
  onUpdateStatus,
  onAssignUser,
  onSendPing,
  onApprovalChange,
  onUpdateDueDate,
  hidePing = false,
}: TicketDetailsSidebarProps) => {
  const [showApprovalDialog, setShowApprovalDialog] = useState(false);
  const [pendingStatusId, setPendingStatusId] = useState<string | null>(null);
  const [selectedApprovers, setSelectedApprovers] = useState<number[]>([]);
  
  const handleStatusChange = (statusId: string) => {
    const status = statuses.find(s => s.id.toString() === statusId);
    if (status?.is_approval) {
      setPendingStatusId(statusId);
      setShowApprovalDialog(true);
    } else {
      onUpdateStatus(statusId);
    }
  };
  
  const handleApprovalConfirm = async () => {
    if (!pendingStatusId) return;
    
    try {
      const token = localStorage.getItem('auth_token') || sessionStorage.getItem('auth_token');
      
      await onUpdateStatus(pendingStatusId);
      
      if (selectedApprovers.length > 0) {
        const { apiFetch, API_URL } = await import('@/utils/api');
        await apiFetch(`${API_URL}?endpoint=ticket-approvals`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'X-Auth-Token': token || '',
          },
          body: JSON.stringify({
            ticket_id: ticket.id,
            approver_ids: selectedApprovers,
          }),
        });
      }
      
      setShowApprovalDialog(false);
      setPendingStatusId(null);
      setSelectedApprovers([]);
    } catch (error) {
      console.error('Error confirming approval:', error);
    }
  };
  
  const toggleApprover = (userId: number) => {
    setSelectedApprovers(prev => 
      prev.includes(userId) 
        ? prev.filter(id => id !== userId)
        : [...prev, userId]
    );
  };

  const handleApprovalCancel = () => {
    setShowApprovalDialog(false);
    setPendingStatusId(null);
    setSelectedApprovers([]);
  };

  return (
    <>
      <div className="w-full lg:w-[400px] space-y-3 flex-shrink-0">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-1 gap-3">
          <TicketTimerCard dueDate={ticket.due_date} />
          {!hidePing && <TicketPingCard onSendPing={onSendPing} sendingPing={sendingPing} />}
        </div>
        
        <TicketInfoFields
          ticket={ticket}
          statuses={statuses}
          users={users}
          updating={updating}
          isCustomer={isCustomer}
          onStatusChange={handleStatusChange}
          onAssignUser={onAssignUser}
          onUpdateDueDate={onUpdateDueDate}
        />

        <TicketApprovalBlock
          ticketId={ticket.id}
          statusName={ticket.status_name || ''}
          onStatusChange={onApprovalChange || (() => {})}
          availableUsers={users}
        />

        <TicketConfirmationBlock
          ticket={ticket}
          isPendingConfirmation={!!statuses.find(s => s.id === ticket.status_id)?.is_pending_confirmation}
          onChanged={onApprovalChange || (() => {})}
        />
      </div>
      
      <ApprovalDialog
        open={showApprovalDialog}
        onOpenChange={setShowApprovalDialog}
        users={users}
        selectedApprovers={selectedApprovers}
        onToggleApprover={toggleApprover}
        onConfirm={handleApprovalConfirm}
        onCancel={handleApprovalCancel}
      />
    </>
  );
};

export default TicketDetailsSidebar;