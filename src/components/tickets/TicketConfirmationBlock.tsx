import { useState } from 'react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import Icon from '@/components/ui/icon';
import { apiFetch, API_URL } from '@/utils/api';
import { useAuth } from '@/contexts/AuthContext';

interface TicketConfirmationBlockProps {
  ticket: {
    id: number;
    assigned_to?: number;
    created_by: number;
    status_name?: string;
    rating?: number;
    rejection_reason?: string;
    confirmation_sent_at?: string;
  };
  isPendingConfirmation: boolean;
  onChanged: () => void;
}

const StarRating = ({ value, onChange }: { value: number; onChange: (v: number) => void }) => (
  <div className="flex gap-1">
    {[1, 2, 3, 4, 5].map((star) => (
      <button
        key={star}
        type="button"
        onClick={() => onChange(star)}
        className="text-2xl transition-transform hover:scale-110"
      >
        <span style={{ color: star <= value ? '#f59e0b' : '#374151' }}>★</span>
      </button>
    ))}
  </div>
);

const TicketConfirmationBlock = ({
  ticket,
  isPendingConfirmation,
  onChanged,
}: TicketConfirmationBlockProps) => {
  const { user, token } = useAuth();
  const [loading, setLoading] = useState(false);
  const [showConfirmDialog, setShowConfirmDialog] = useState(false);
  const [showRejectDialog, setShowRejectDialog] = useState(false);
  const [rating, setRating] = useState(0);
  const [rejectionReason, setRejectionReason] = useState('');

  const isAssignee = user?.id === ticket.assigned_to;
  const isCreator = user?.id === ticket.created_by;

  const sendForConfirmation = async () => {
    setLoading(true);
    try {
      const res = await apiFetch(`${API_URL}?endpoint=ticket-confirmation`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'X-Auth-Token': token },
        body: JSON.stringify({ ticket_id: ticket.id }),
      });
      if (res.ok) onChanged();
    } finally {
      setLoading(false);
    }
  };

  const handleConfirm = async () => {
    if (rating === 0) return;
    setLoading(true);
    try {
      const res = await apiFetch(`${API_URL}?endpoint=ticket-confirmation`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', 'X-Auth-Token': token },
        body: JSON.stringify({ ticket_id: ticket.id, action: 'confirm', rating }),
      });
      if (res.ok) {
        setShowConfirmDialog(false);
        onChanged();
      }
    } finally {
      setLoading(false);
    }
  };

  const handleReject = async () => {
    if (!rejectionReason.trim()) return;
    setLoading(true);
    try {
      const res = await apiFetch(`${API_URL}?endpoint=ticket-confirmation`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', 'X-Auth-Token': token },
        body: JSON.stringify({ ticket_id: ticket.id, action: 'reject', rejection_reason: rejectionReason }),
      });
      if (res.ok) {
        setShowRejectDialog(false);
        setRejectionReason('');
        onChanged();
      }
    } finally {
      setLoading(false);
    }
  };

  if (ticket.rating) {
    return (
      <div className="rounded-lg bg-card border p-4">
        <h3 className="text-xs font-semibold mb-3 text-foreground uppercase tracking-wide flex items-center gap-2">
          <Icon name="Star" size={14} />
          Оценка заказчика
        </h3>
        <div className="flex gap-0.5">
          {[1, 2, 3, 4, 5].map((star) => (
            <span key={star} className="text-xl" style={{ color: star <= ticket.rating! ? '#f59e0b' : '#374151' }}>
              ★
            </span>
          ))}
        </div>
      </div>
    );
  }

  if (isPendingConfirmation && isCreator) {
    return (
      <>
        <div className="rounded-lg border border-orange-500/40 bg-orange-500/10 p-4">
          <h3 className="text-xs font-semibold mb-1 text-orange-400 uppercase tracking-wide flex items-center gap-2">
            <Icon name="Clock" size={14} />
            Ожидает вашего подтверждения
          </h3>
          <p className="text-xs text-muted-foreground mb-3">
            Исполнитель сообщает, что работа выполнена. Проверьте и подтвердите или верните в работу.
          </p>
          <div className="flex gap-2">
            <Button
              size="sm"
              className="flex-1 bg-green-600 hover:bg-green-700 text-white"
              onClick={() => setShowConfirmDialog(true)}
            >
              <Icon name="CheckCircle" size={14} className="mr-1" />
              Подтвердить
            </Button>
            <Button
              size="sm"
              variant="outline"
              className="flex-1 border-red-500/40 text-red-400 hover:bg-red-500/10"
              onClick={() => setShowRejectDialog(true)}
            >
              <Icon name="XCircle" size={14} className="mr-1" />
              Отклонить
            </Button>
          </div>
        </div>

        <Dialog open={showConfirmDialog} onOpenChange={setShowConfirmDialog}>
          <DialogContent className="max-w-sm">
            <DialogHeader>
              <DialogTitle>Подтверждение выполнения</DialogTitle>
            </DialogHeader>
            <div className="py-2 space-y-4">
              <p className="text-sm text-muted-foreground">Оцените качество выполнения заявки:</p>
              <StarRating value={rating} onChange={setRating} />
              {rating > 0 && (
                <p className="text-xs text-muted-foreground">
                  {['', 'Очень плохо', 'Плохо', 'Нормально', 'Хорошо', 'Отлично'][rating]}
                </p>
              )}
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setShowConfirmDialog(false)}>Отмена</Button>
              <Button
                disabled={rating === 0 || loading}
                onClick={handleConfirm}
                className="bg-green-600 hover:bg-green-700 text-white"
              >
                {loading ? <Icon name="Loader2" size={16} className="animate-spin mr-1" /> : null}
                Подтвердить
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        <Dialog open={showRejectDialog} onOpenChange={setShowRejectDialog}>
          <DialogContent className="max-w-sm">
            <DialogHeader>
              <DialogTitle>Отклонение заявки</DialogTitle>
            </DialogHeader>
            <div className="py-2 space-y-2">
              <p className="text-sm text-muted-foreground">Укажите причину — исполнитель её увидит:</p>
              <Textarea
                placeholder="Что не так? Что нужно доработать?"
                value={rejectionReason}
                onChange={(e) => setRejectionReason(e.target.value)}
                rows={3}
              />
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setShowRejectDialog(false)}>Отмена</Button>
              <Button
                disabled={!rejectionReason.trim() || loading}
                onClick={handleReject}
                variant="destructive"
              >
                {loading ? <Icon name="Loader2" size={16} className="animate-spin mr-1" /> : null}
                Вернуть в работу
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </>
    );
  }

  if (isPendingConfirmation && isAssignee) {
    return (
      <div className="rounded-lg border border-orange-500/40 bg-orange-500/10 p-4">
        <h3 className="text-xs font-semibold mb-1 text-orange-400 uppercase tracking-wide flex items-center gap-2">
          <Icon name="Clock" size={14} />
          Ожидает подтверждения
        </h3>
        <p className="text-xs text-muted-foreground">
          Заявка отправлена заказчику на проверку.
          {ticket.confirmation_sent_at && (
            <> Отправлено {new Date(ticket.confirmation_sent_at).toLocaleDateString('ru-RU')}.</>
          )}
        </p>
      </div>
    );
  }

  if (isAssignee && !isPendingConfirmation) {
    return (
      <div className="rounded-lg bg-card border p-4">
        <h3 className="text-xs font-semibold mb-3 text-foreground uppercase tracking-wide flex items-center gap-2">
          <Icon name="CheckCheck" size={14} />
          Готово к сдаче?
        </h3>
        {ticket.rejection_reason && (
          <div className="mb-3 p-2 rounded bg-red-500/10 border border-red-500/30">
            <p className="text-xs text-red-400 font-medium mb-0.5">Причина возврата:</p>
            <p className="text-xs text-muted-foreground">{ticket.rejection_reason}</p>
          </div>
        )}
        <Button
          size="sm"
          className="w-full"
          disabled={loading}
          onClick={sendForConfirmation}
        >
          {loading ? (
            <Icon name="Loader2" size={14} className="mr-1 animate-spin" />
          ) : (
            <Icon name="Send" size={14} className="mr-1" />
          )}
          Отправить на подтверждение
        </Button>
      </div>
    );
  }

  return null;
};

export default TicketConfirmationBlock;