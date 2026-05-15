import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import Icon from '@/components/ui/icon';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { useAuth } from '@/contexts/AuthContext';
import { apiFetch, API_URL } from '@/utils/api';

interface ReopenTicketButtonProps {
  ticketId: number;
  onReopened?: () => void;
  className?: string;
}

const ReopenTicketButton = ({ ticketId, onReopened, className }: ReopenTicketButtonProps) => {
  const { token } = useAuth();
  const [open, setOpen] = useState(false);
  const [reason, setReason] = useState('');
  const [loading, setLoading] = useState(false);

  const handleReopen = async () => {
    if (!reason.trim()) return;
    setLoading(true);
    try {
      const res = await apiFetch(`${API_URL}?endpoint=tickets`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', 'X-Auth-Token': token },
        body: JSON.stringify({ id: ticketId, action: 'reopen', reopen_reason: reason.trim() }),
      });
      if (res.ok) {
        setOpen(false);
        setReason('');
        onReopened?.();
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <Button
        size="default"
        className={
          className ??
          'bg-orange-500 hover:bg-orange-600 text-white font-semibold shadow-md shadow-orange-500/30 hover:shadow-orange-500/50 transition-all'
        }
        onClick={() => setOpen(true)}
      >
        <Icon name="RotateCcw" size={16} className="mr-2" />
        Открыть повторно
      </Button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Открыть заявку повторно</DialogTitle>
          </DialogHeader>
          <div className="py-2">
            <p className="text-sm text-muted-foreground mb-3">
              Опишите причину повторного открытия заявки. Это поможет исполнителю понять, что нужно доделать.
            </p>
            <Textarea
              placeholder="Укажите причину..."
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              rows={4}
              className="resize-none"
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => { setOpen(false); setReason(''); }}>
              Отмена
            </Button>
            <Button
              disabled={!reason.trim() || loading}
              onClick={handleReopen}
            >
              {loading ? (
                <Icon name="Loader2" size={15} className="mr-2 animate-spin" />
              ) : (
                <Icon name="RotateCcw" size={15} className="mr-2" />
              )}
              Открыть повторно
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
};

export default ReopenTicketButton;