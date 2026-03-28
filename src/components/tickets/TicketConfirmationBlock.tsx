import { useState } from 'react';
import { Button } from '@/components/ui/button';
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

const TicketConfirmationBlock = ({
  ticket,
  isPendingConfirmation,
  onChanged,
}: TicketConfirmationBlockProps) => {
  const { user, token } = useAuth();
  const [loading, setLoading] = useState(false);

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
    return null;
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
          size="lg"
          disabled={loading}
          onClick={sendForConfirmation}
          className="w-full bg-gradient-to-r from-violet-600 to-purple-600 hover:from-violet-500 hover:to-purple-500 text-white font-bold text-base shadow-lg shadow-purple-500/30 hover:shadow-purple-500/50 transition-all duration-200 hover:scale-[1.02] active:scale-[0.98]"
        >
          {loading ? (
            <Icon name="Loader2" size={18} className="mr-2 animate-spin" />
          ) : (
            <Icon name="Send" size={18} className="mr-2" />
          )}
          Отправить на подтверждение
        </Button>
      </div>
    );
  }

  return null;
};

export default TicketConfirmationBlock;