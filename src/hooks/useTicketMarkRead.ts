import { useCallback } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { TICKETS_MARK_READ_URL } from '@/utils/api';

export const useTicketMarkRead = () => {
  const { token, user } = useAuth();

  const markRead = useCallback(
    async (ticketId: number) => {
      if (!token || !user || !ticketId) return;
      try {
        await fetch(TICKETS_MARK_READ_URL, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'X-Auth-Token': token,
          },
          body: JSON.stringify({ ticket_id: ticketId }),
        });
        window.dispatchEvent(new CustomEvent('notifications:refresh'));
      } catch (e) {
        console.error('[useTicketMarkRead] failed:', e);
      }
    },
    [token, user],
  );

  const markAllRead = useCallback(async () => {
    if (!token || !user) return;
    try {
      await fetch(TICKETS_MARK_READ_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Auth-Token': token,
        },
        body: JSON.stringify({ mark_all: true }),
      });
      window.dispatchEvent(new CustomEvent('notifications:refresh'));
    } catch (e) {
      console.error('[useTicketMarkRead] mark_all failed:', e);
    }
  }, [token, user]);

  return { markRead, markAllRead };
};

export default useTicketMarkRead;