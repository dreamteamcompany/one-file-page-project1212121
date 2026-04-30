import { useEffect, useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { USERS_SEARCH_URL } from '@/utils/api';

export interface MentionUser {
  id: number;
  username: string;
  full_name?: string | null;
  email?: string | null;
  photo_url?: string | null;
}

/**
 * Поиск пользователей для автокомплита @упоминаний.
 * Возвращает MentionUser[] с дебаунсом 250мс.
 */
export const useMentionSearch = (query: string, enabled: boolean = true) => {
  const { token } = useAuth();
  const [users, setUsers] = useState<MentionUser[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!enabled || !token) {
      setUsers([]);
      return;
    }
    const trimmed = query.trim();
    if (trimmed.length < 1) {
      setUsers([]);
      return;
    }
    let cancelled = false;
    const timer = setTimeout(async () => {
      try {
        setLoading(true);
        const res = await fetch(
          `${USERS_SEARCH_URL}?q=${encodeURIComponent(trimmed)}&limit=8`,
          { headers: { 'X-Auth-Token': token } },
        );
        if (!cancelled && res.ok) {
          const data = await res.json();
          setUsers(data.users || []);
        }
      } catch (e) {
        console.error('[useMentionSearch] failed:', e);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }, 250);

    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [query, token, enabled]);

  return { users, loading };
};

export default useMentionSearch;
