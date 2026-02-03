import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import Icon from '@/components/ui/icon';
import { formatDistanceToNow } from 'date-fns';
import { ru } from 'date-fns/locale';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { API_URL, apiFetch } from '@/utils/api';

interface ApprovalHistory {
  id: number;
  action: string;
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
  const [selectedApproverId, setSelectedApproverId] = useState<string>('');

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
    if (!token || !user || !selectedApproverId) return;

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
            approver_ids: [parseInt(selectedApproverId)]
          }),
        }
      );

      if (response.ok) {
        await loadApprovalHistory();
        onStatusChange();
        setSelectedApproverId('');
      }
    } catch (error) {
      console.error('Failed to submit for approval:', error);
    } finally {
      setSubmitting(false);
    }
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

  const pendingApprovals = approvalHistory.filter(a => a.action === 'pending');
  const completedApprovals = approvalHistory.filter(a => a.action !== 'pending' && a.action !== 'submitted');
  const isAwaitingApproval = statusName === 'На согласовании';
  const isApproved = statusName === 'Одобрена';
  const isRejected = statusName === 'Отклонена';
  const canSubmit = statusName === 'В работе' || statusName === 'Новая';
  const canApprove = isAwaitingApproval && pendingApprovals.some(a => a.approver_id === user?.id);

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

      {canSubmit && (
        <div className="space-y-3">
          <div>
            <p className="text-xs font-semibold mb-3 text-foreground uppercase tracking-wide flex items-center gap-2">
              <Icon name="UserCheck" size={14} />
              Согласующий
            </p>
            <Select
              value={selectedApproverId}
              onValueChange={setSelectedApproverId}
              disabled={submitting}
            >
              <SelectTrigger>
                <SelectValue placeholder="Выберите согласующего" />
              </SelectTrigger>
              <SelectContent>
                {availableUsers.map((u) => (
                  <SelectItem key={u.id} value={u.id.toString()}>
                    <div className="flex flex-col">
                      <span className="text-sm">{u.name}</span>
                      <span className="text-xs text-muted-foreground">{u.email}</span>
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          
          {selectedApproverId && (
            <Button
              onClick={handleSubmitForApproval}
              disabled={submitting}
              className="w-full"
            >
              {submitting ? 'Отправка...' : 'Отправить на согласование'}
            </Button>
          )}
        </div>
      )}

      {isAwaitingApproval && (
        <div className="space-y-3">
          <div className="p-3 bg-yellow-50 dark:bg-yellow-950/20 rounded-lg">
            <p className="text-sm font-medium text-yellow-800 dark:text-yellow-200 flex items-center gap-2">
              <Icon name="Clock" size={16} />
              Ожидается согласование от:
            </p>
            <ul className="mt-2 space-y-1 text-sm text-yellow-700 dark:text-yellow-300">
              {pendingApprovals.map((approval) => (
                <li key={approval.id}>• {approval.approver_name || `Пользователь #${approval.approver_id}`}</li>
              ))}
            </ul>
          </div>

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
        </div>
      )}

      {isApproved && (
        <div className="p-3 bg-green-50 dark:bg-green-950/20 rounded-lg">
          <p className="text-sm font-medium text-green-800 dark:text-green-200 flex items-center gap-2">
            <Icon name="CheckCircle" size={16} />
            Заявка одобрена
          </p>
          {completedApprovals.filter(a => a.action === 'approved').map((approval) => (
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
          {completedApprovals.filter(a => a.action === 'rejected').map((approval) => (
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

      {approvalHistory.length > 0 && (
        <div className="space-y-2">
          <h4 className="text-sm font-medium text-muted-foreground">История согласований</h4>
          <div className="space-y-2">
            {approvalHistory.slice().reverse().map((item) => (
              <div key={item.id} className="flex items-start gap-2 text-sm p-2 rounded bg-muted/50">
                {getActionIcon(item.action)}
                <div className="flex-1">
                  <p className="font-medium">{getActionText(item.action)}</p>
                  {item.comment && (
                    <p className="text-muted-foreground text-xs mt-1">{item.comment}</p>
                  )}
                  <p className="text-xs text-muted-foreground mt-1">
                    {formatDistanceToNow(new Date(item.created_at), { addSuffix: true, locale: ru })}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default TicketApprovalBlock;