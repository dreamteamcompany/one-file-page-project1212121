import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import Icon from '@/components/ui/icon';
import { formatDistanceToNow } from 'date-fns';
import { ru } from 'date-fns/locale';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { API_URL, apiFetch } from '@/utils/api';

interface ApprovalHistory {
  id: number;
  action: string;
  status: string;
  comment?: string;
  created_at: string;
  approver_id: number;
  approver_name?: string;
  approver_email?: string;
}

interface User {
  id: number;
  name: string;
  email: string;
}

interface TicketApprovalBlockProps {
  ticketId: number;
  statusName: string;
  onStatusChange: () => void;
  availableUsers?: User[];
}

const TicketApprovalBlock = ({ ticketId, statusName, onStatusChange, availableUsers = [] }: TicketApprovalBlockProps) => {
  const { token, user } = useAuth();
  const [approvalHistory, setApprovalHistory] = useState<ApprovalHistory[]>([]);
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [comment, setComment] = useState('');
  const [showCommentField, setShowCommentField] = useState(false);
  const [actionType, setActionType] = useState<'approved' | 'rejected' | null>(null);
  const [showApproverSelect, setShowApproverSelect] = useState(false);
  const [selectedApprovers, setSelectedApprovers] = useState<number[]>([]);
  const [isPopoverOpen, setIsPopoverOpen] = useState(false);

  const loadApprovalHistory = async () => {
    if (!token) return;

    setLoading(true);
    try {
      const response = await apiFetch(
        `${API_URL}?endpoint=ticket-approvals&ticket_id=${ticketId}`,
        {
          headers: {
            'X-Auth-Token': token,
          },
        }
      );

      if (response.ok) {
        const data = await response.json();
        setApprovalHistory(data);
      }
    } catch (error) {
      console.error('Failed to load approval history:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadApprovalHistory();
  }, [ticketId, token]);

  const handleSubmitForApproval = async () => {
    if (!token || !user || selectedApprovers.length === 0) return;

    setSubmitting(true);
    try {
      const response = await apiFetch(
        `${API_URL}?endpoint=ticket-approvals`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'X-Auth-Token': token,
          },
          body: JSON.stringify({ 
            ticket_id: ticketId,
            approver_ids: selectedApprovers
          }),
        }
      );

      if (response.ok) {
        await loadApprovalHistory();
        onStatusChange();
        setSelectedApprovers([]);
        setIsPopoverOpen(false);
      }
    } catch (error) {
      console.error('Failed to submit for approval:', error);
    } finally {
      setSubmitting(false);
    }
  };

  const toggleApprover = (userId: number) => {
    setSelectedApprovers(prev => 
      prev.includes(userId) 
        ? prev.filter(id => id !== userId)
        : [...prev, userId]
    );
  };

  const getSelectedApproversText = () => {
    if (selectedApprovers.length === 0) return 'Выберите согласующих';
    if (selectedApprovers.length === 1) {
      const user = availableUsers.find(u => u.id === selectedApprovers[0]);
      return user?.name || 'Выбран 1';
    }
    return `Выбрано: ${selectedApprovers.length}`;
  };

  const handleApprovalAction = async () => {
    if (!token || !user || !actionType) return;

    setSubmitting(true);
    try {
      const response = await apiFetch(
        `${API_URL}?endpoint=ticket-approvals`,
        {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
            'X-Auth-Token': token,
          },
          body: JSON.stringify({
            ticket_id: ticketId,
            action: actionType,
            comment: comment,
          }),
        }
      );

      if (response.ok) {
        await loadApprovalHistory();
        onStatusChange();
        setComment('');
        setShowCommentField(false);
        setActionType(null);
      }
    } catch (error) {
      console.error('Failed to process approval:', error);
    } finally {
      setSubmitting(false);
    }
  };

  const pendingApprovals = approvalHistory.filter(a => a.status === 'pending');
  const completedApprovals = approvalHistory.filter(a => a.status !== 'pending');
  const isAwaitingApproval = statusName === 'На согласовании';
  const isApproved = statusName === 'Одобрена';
  const isRejected = statusName === 'Отклонена';
  const canSubmit = statusName === 'В работе' || statusName === 'Новая';
  const canApprove = pendingApprovals.some(a => a.approver_id === user?.id);

  const getActionIcon = (action: string) => {
    switch (action) {
      case 'approved':
        return <Icon name="CheckCircle" className="text-green-500" size={16} />;
      case 'rejected':
        return <Icon name="XCircle" className="text-red-500" size={16} />;
      case 'submitted':
        return <Icon name="Send" className="text-blue-500" size={16} />;
      case 'pending':
        return <Icon name="Clock" className="text-yellow-500" size={16} />;
      default:
        return null;
    }
  };

  const getActionText = (action: string) => {
    switch (action) {
      case 'approved':
        return 'Одобрил';
      case 'rejected':
        return 'Отклонил';
      case 'submitted':
        return 'Отправил на согласование';
      case 'pending':
        return 'Ожидает решения';
      default:
        return action;
    }
  };

  return (
    <div className="border rounded-lg p-4 space-y-4 bg-card flex flex-col justify-center md:h-[380px] lg:h-auto">
      <h3 className="font-semibold flex items-center gap-2">
        <Icon name="FileCheck" size={20} />
        Согласование
      </h3>

      {canSubmit && approvalHistory.length === 0 && (
        <div className="space-y-3">
          <div>
            <p className="text-xs font-semibold mb-3 text-foreground uppercase tracking-wide flex items-center gap-2">
              <Icon name="UserCheck" size={14} />
              Согласующие
            </p>
            <Popover open={isPopoverOpen} onOpenChange={setIsPopoverOpen}>
              <PopoverTrigger asChild>
                <button
                  className="flex h-10 w-full items-center justify-between rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                  disabled={submitting}
                >
                  <span className={selectedApprovers.length === 0 ? 'text-muted-foreground' : ''}>
                    {getSelectedApproversText()}
                  </span>
                  <Icon name="ChevronDown" size={16} className="opacity-50" />
                </button>
              </PopoverTrigger>
              <PopoverContent className="w-[var(--radix-popover-trigger-width)] p-0" align="start">
                <div className="max-h-[300px] overflow-y-auto p-2">
                  {availableUsers.map((u) => (
                    <label
                      key={u.id}
                      className="flex items-center gap-2 p-2 hover:bg-muted rounded cursor-pointer"
                    >
                      <Checkbox
                        checked={selectedApprovers.includes(u.id)}
                        onCheckedChange={() => toggleApprover(u.id)}
                      />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate">{u.name}</p>
                        <p className="text-xs text-muted-foreground truncate">{u.email}</p>
                      </div>
                    </label>
                  ))}
                </div>
                {selectedApprovers.length > 0 && (
                  <div className="border-t p-2">
                    <Button
                      onClick={handleSubmitForApproval}
                      disabled={submitting}
                      className="w-full"
                    >
                      {submitting ? 'Отправка...' : `Отправить на согласование (${selectedApprovers.length})`}
                    </Button>
                  </div>
                )}
              </PopoverContent>
            </Popover>
          </div>
        </div>
      )}

      {approvalHistory.length > 0 && (
        <div className="space-y-2">
          <p className="text-xs font-semibold text-foreground uppercase tracking-wide flex items-center gap-2">
            <Icon name="Users" size={14} />
            Согласующие
          </p>
          <div className="space-y-2">
            {approvalHistory.map((approval) => (
              <div 
                key={approval.id} 
                className="flex items-center justify-between p-2 rounded bg-muted/50"
              >
                <div className="flex items-center gap-2 flex-1 min-w-0">
                  {approval.status === 'pending' && <Icon name="Clock" size={14} className="text-yellow-500 flex-shrink-0" />}
                  {approval.status === 'approved' && <Icon name="CheckCircle" size={14} className="text-green-500 flex-shrink-0" />}
                  {approval.status === 'rejected' && <Icon name="XCircle" size={14} className="text-red-500 flex-shrink-0" />}
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">
                      {approval.approver_name || `Пользователь #${approval.approver_id}`}
                    </p>
                  </div>
                </div>
                <div className="text-xs font-medium flex-shrink-0 ml-2">
                  {approval.status === 'pending' && <span className="text-yellow-600 dark:text-yellow-400">Ожидает</span>}
                  {approval.status === 'approved' && <span className="text-green-600 dark:text-green-400">Одобрил</span>}
                  {approval.status === 'rejected' && <span className="text-red-600 dark:text-red-400">Отклонил</span>}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {canApprove && !showCommentField && (
        <div className="flex gap-2">
          <Button
            onClick={() => {
              setActionType('approved');
              handleApprovalAction();
            }}
            disabled={submitting}
            className="flex-1 bg-green-600 hover:bg-green-700"
          >
            <Icon name="Check" size={16} className="mr-1" />
            Одобрить
          </Button>
          <Button
            onClick={() => {
              setActionType('rejected');
              setShowCommentField(true);
            }}
            disabled={submitting}
            variant="destructive"
            className="flex-1"
          >
            <Icon name="X" size={16} className="mr-1" />
            Отклонить
          </Button>
        </div>
      )}

      {showCommentField && (
        <div className="space-y-2">
          <Textarea
            value={comment}
            onChange={(e) => setComment(e.target.value)}
            placeholder="Причина отклонения (опционально)"
            rows={3}
          />
          <div className="flex gap-2">
            <Button
              onClick={handleApprovalAction}
              disabled={submitting}
              variant="destructive"
              className="flex-1"
            >
              {submitting ? 'Отправка...' : 'Подтвердить отклонение'}
            </Button>
            <Button
              onClick={() => {
                setShowCommentField(false);
                setActionType(null);
                setComment('');
              }}
              variant="outline"
              disabled={submitting}
            >
              Отмена
            </Button>
          </div>
        </div>
      )}

      {isApproved && (
        <div className="p-3 bg-green-50 dark:bg-green-950/20 rounded-lg">
          <p className="text-sm font-medium text-green-800 dark:text-green-200 flex items-center gap-2">
            <Icon name="CheckCircle" size={16} />
            Заявка одобрена
          </p>
          {completedApprovals.filter(a => a.status === 'approved').map((approval) => (
            <p key={approval.id} className="text-xs text-green-700 dark:text-green-300 mt-1">
              {formatDistanceToNow(new Date(approval.created_at), { addSuffix: true, locale: ru })}
            </p>
          ))}
        </div>
      )}

      {isRejected && (
        <div className="p-3 bg-red-50 dark:bg-red-950/20 rounded-lg">
          <p className="text-sm font-medium text-red-800 dark:text-red-200 flex items-center gap-2">
            <Icon name="XCircle" size={16} />
            Заявка отклонена
          </p>
          {completedApprovals.filter(a => a.status === 'rejected').map((approval) => (
            <div key={approval.id} className="mt-2">
              <p className="text-xs text-red-700 dark:text-red-300">
                {formatDistanceToNow(new Date(approval.created_at), { addSuffix: true, locale: ru })}
              </p>
              {approval.comment && (
                <p className="text-sm text-red-600 dark:text-red-400 mt-1">
                  Причина: {approval.comment}
                </p>
              )}
            </div>
          ))}
          <div className="flex gap-2 mt-3">
            <Button
              onClick={handleSubmitForApproval}
              disabled={submitting}
              size="sm"
              variant="outline"
              className="flex-1"
            >
              <Icon name="RotateCcw" size={14} className="mr-1" />
              Доработать и отправить снова
            </Button>
          </div>
        </div>
      )}


    </div>
  );
};

export default TicketApprovalBlock;