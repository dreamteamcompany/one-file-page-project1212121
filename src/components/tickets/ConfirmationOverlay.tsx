import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import Icon from '@/components/ui/icon';
import { apiFetch, API_URL } from '@/utils/api';
import { useAuth } from '@/contexts/AuthContext';

interface ConfirmationOverlayProps {
  ticket: {
    id: number;
    title: string;
    description?: string;
    confirmation_sent_at?: string;
    assigned_to?: number;
    assignee_name?: string;
  };
  onChanged: () => void;
  onClose?: () => void;
}

const StarRating = ({ value, onChange }: { value: number; onChange: (v: number) => void }) => {
  const [hover, setHover] = useState(0);

  return (
    <div className="flex gap-2">
      {[1, 2, 3, 4, 5].map((star) => (
        <button
          key={star}
          type="button"
          onClick={() => onChange(star)}
          onMouseEnter={() => setHover(star)}
          onMouseLeave={() => setHover(0)}
          className="text-4xl transition-transform hover:scale-125 focus:outline-none"
        >
          <span style={{ color: star <= (hover || value) ? '#f59e0b' : '#4b5563' }}>★</span>
        </button>
      ))}
    </div>
  );
};

const RATING_LABELS = ['', 'Очень плохо', 'Плохо', 'Нормально', 'Хорошо', 'Отлично'];

const ConfirmationOverlay = ({ ticket, onChanged, onClose }: ConfirmationOverlayProps) => {
  const { token } = useAuth();
  const [mode, setMode] = useState<'choose' | 'confirm' | 'reject'>('choose');
  const [rating, setRating] = useState(0);
  const [rejectionReason, setRejectionReason] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');



  const handleConfirm = async () => {
    if (rating === 0) return;
    setLoading(true);
    setError('');
    try {
      const res = await apiFetch(`${API_URL}?endpoint=ticket-confirmation`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', 'X-Auth-Token': token },
        body: JSON.stringify({ ticket_id: ticket.id, action: 'confirm', rating }),
      });
      if (res.ok) {
        onChanged();
      } else {
        const data = await res.json().catch(() => ({}));
        setError(data.error || 'Не удалось подтвердить заявку');
      }
    } catch {
      setError('Ошибка сети');
    } finally {
      setLoading(false);
    }
  };

  const handleReject = async () => {
    if (!rejectionReason.trim()) return;
    setLoading(true);
    setError('');
    try {
      const res = await apiFetch(`${API_URL}?endpoint=ticket-confirmation`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', 'X-Auth-Token': token },
        body: JSON.stringify({ ticket_id: ticket.id, action: 'reject', rejection_reason: rejectionReason }),
      });
      if (res.ok) {
        onChanged();
      } else {
        const data = await res.json().catch(() => ({}));
        setError(data.error || 'Не удалось отклонить заявку');
      }
    } catch {
      setError('Ошибка сети');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[100] bg-background/95 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="rounded-2xl border bg-card shadow-2xl p-6 space-y-6">
          <div className="text-center space-y-2">
            <div className="mx-auto w-16 h-16 rounded-full bg-orange-500/10 flex items-center justify-center mb-4">
              <Icon name="ClipboardCheck" size={32} className="text-orange-500" />
            </div>
            <h2 className="text-xl font-bold">Подтверждение заявки</h2>
            <p className="text-sm text-muted-foreground">
              Заявка #{ticket.id}: {ticket.title}
            </p>
            {ticket.assignee_name && (
              <p className="text-xs text-muted-foreground">
                Исполнитель: {ticket.assignee_name}
              </p>
            )}
          </div>

          {mode === 'choose' && (
            <div className="space-y-4">
              <p className="text-sm text-center text-muted-foreground">
                Исполнитель сообщает, что работа выполнена. Проверьте результат и примите решение.
              </p>
              <div className="grid grid-cols-2 gap-3">
                <Button
                  size="lg"
                  className="bg-green-600 hover:bg-green-700 text-white h-14 text-base"
                  onClick={() => setMode('confirm')}
                >
                  <Icon name="CheckCircle" size={20} className="mr-2" />
                  Подтвердить
                </Button>
                <Button
                  size="lg"
                  variant="outline"
                  className="border-red-500/40 text-red-400 hover:bg-red-500/10 h-14 text-base"
                  onClick={() => setMode('reject')}
                >
                  <Icon name="XCircle" size={20} className="mr-2" />
                  Отклонить
                </Button>
              </div>
            </div>
          )}

          {mode === 'confirm' && (
            <div className="space-y-5">
              <div className="text-center space-y-3">
                <p className="text-sm text-muted-foreground">
                  Оцените качество выполнения:
                </p>
                <div className="flex justify-center">
                  <StarRating value={rating} onChange={setRating} />
                </div>
                {rating > 0 && (
                  <p className="text-sm font-medium text-amber-500">
                    {RATING_LABELS[rating]}
                  </p>
                )}
              </div>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  className="flex-1"
                  onClick={() => { setMode('choose'); setRating(0); }}
                  disabled={loading}
                >
                  Назад
                </Button>
                <Button
                  className="flex-1 bg-green-600 hover:bg-green-700 text-white"
                  disabled={rating === 0 || loading}
                  onClick={handleConfirm}
                >
                  {loading && <Icon name="Loader2" size={16} className="mr-2 animate-spin" />}
                  Подтвердить
                </Button>
              </div>
            </div>
          )}

          {mode === 'reject' && (
            <div className="space-y-4">
              <div className="space-y-2">
                <p className="text-sm text-muted-foreground">
                  Опишите, что не устроило — исполнитель увидит эту причину:
                </p>
                <Textarea
                  placeholder="Что нужно доработать?"
                  value={rejectionReason}
                  onChange={(e) => setRejectionReason(e.target.value)}
                  rows={4}
                  autoFocus
                />
              </div>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  className="flex-1"
                  onClick={() => { setMode('choose'); setRejectionReason(''); }}
                  disabled={loading}
                >
                  Назад
                </Button>
                <Button
                  variant="destructive"
                  className="flex-1"
                  disabled={!rejectionReason.trim() || loading}
                  onClick={handleReject}
                >
                  {loading && <Icon name="Loader2" size={16} className="mr-2 animate-spin" />}
                  Вернуть в работу
                </Button>
              </div>
            </div>
          )}

          {error && (
            <div className="rounded-lg bg-red-500/10 border border-red-500/30 p-3 text-sm text-red-400 text-center">
              {error}
            </div>
          )}

          {onClose && mode === 'choose' && (
            <Button
              variant="ghost"
              className="w-full text-muted-foreground hover:text-foreground"
              onClick={onClose}
            >
              <Icon name="ArrowLeft" size={16} className="mr-2" />
              Вернуться к заявке
            </Button>
          )}

          <p className="text-xs text-center text-muted-foreground/60">
            Для выхода необходимо подтвердить или отклонить заявку
          </p>
        </div>
      </div>
    </div>
  );
};

export default ConfirmationOverlay;