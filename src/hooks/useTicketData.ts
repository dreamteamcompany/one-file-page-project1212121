import { useState, useEffect, useRef } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { API_URL, apiFetch } from '@/utils/api';
import type { Ticket, TicketComment, TicketAuditLog, TicketStatus, User } from '@/types';

interface ExecutorGroup {
  id: number;
  name: string;
}

export const useTicketData = (id: string | undefined, initialTicket: Ticket | null = null) => {
  const { token } = useAuth();
  const [ticket, setTicket] = useState<Ticket | null>(initialTicket);
  const [statuses, setStatuses] = useState<TicketStatus[]>([]);
  const [comments, setComments] = useState<TicketComment[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [executorGroups, setExecutorGroups] = useState<ExecutorGroup[]>([]);
  const [auditLogs, setAuditLogs] = useState<TicketAuditLog[]>([]);
  const [loading, setLoading] = useState(false);
  const [loadingComments, setLoadingComments] = useState(false);
  const [loadingHistory, setLoadingHistory] = useState(false);
  const [participantIds, setParticipantIds] = useState<number[]>([]);
  const [myLastSeenAt, setMyLastSeenAt] = useState<string | null>(null);
  const commentsAbortRef = useRef<AbortController | null>(null);
  const commentsRequestIdRef = useRef<string | null>(null);
  const historyAbortRef = useRef<AbortController | null>(null);
  const historyRequestIdRef = useRef<string | null>(null);

  const loadTicket = async (showLoader = true) => {
    try {
      if (showLoader) setLoading(true);
      const response = await apiFetch(`${API_URL}?endpoint=tickets&ticket_id=${id}`, {
        headers: {
          'X-Auth-Token': token,
        },
      });
      if (response.ok) {
        const data = await response.json();
        const foundTicket = data.tickets?.[0];
        if (foundTicket) {
          setTicket(foundTicket);
        }
      }
    } catch (error) {
      console.error('Error loading ticket:', error);
    } finally {
      if (showLoader) setLoading(false);
    }
  };

  const loadStatuses = async () => {
    let firstOk = false;
    let loaded: TicketStatus[] = [];
    try {
      const response = await apiFetch(`${API_URL}?endpoint=ticket-dictionaries-api`, {
        headers: {
          'X-Auth-Token': token,
        },
      });
      if (response.ok) {
        firstOk = true;
        const data = await response.json();
        loaded = Array.isArray(data.statuses) ? data.statuses : [];
      } else {
        console.warn('[loadStatuses] dictionaries-api HTTP', response.status);
      }
    } catch (error) {
      console.error('Error loading statuses (primary):', error);
    }

    // Фолбэк включается ТОЛЬКО если основной endpoint ответил 200, но статусы пустые
    // (например, фильтр по ролям всё срезал). При сетевой ошибке/rate-limit не добиваем бэк.
    if (firstOk && loaded.length === 0) {
      try {
        const fallback = await apiFetch(`${API_URL}?endpoint=ticket-statuses`, {
          headers: { 'X-Auth-Token': token },
        });
        if (fallback.ok) {
          const fbData = await fallback.json();
          if (Array.isArray(fbData)) {
            loaded = fbData;
          }
        } else {
          console.warn('[loadStatuses] fallback ticket-statuses HTTP', fallback.status);
        }
      } catch (fbErr) {
        console.error('[loadStatuses] fallback error:', fbErr);
      }
    }

    setStatuses(loaded);
  };

  const loadUsers = async () => {
    const maxRetries = 3;
    let attempt = 0;
    while (attempt <= maxRetries) {
      try {
        const response = await apiFetch(`${API_URL}?endpoint=users`, {
          headers: {
            'X-Auth-Token': token,
          },
        });
        if (response.ok) {
          const data = await response.json();
          const adaptedUsers = Array.isArray(data) ? data.map((u: { id: number; full_name?: string; username?: string; photo_url?: string }) => ({
            id: u.id,
            name: u.full_name || u.username || '',
            email: u.username || '',
            role: '',
            photo_url: u.photo_url || ''
          })) : [];
          setUsers(adaptedUsers);
          return;
        }
        throw new Error(`HTTP ${response.status}`);
      } catch (error) {
        attempt += 1;
        if (attempt > maxRetries) {
          console.error('Error loading users:', error);
          return;
        }
        await new Promise((resolve) => setTimeout(resolve, 400 * attempt));
      }
    }
  };

  const loadHistory = async (options?: { silent?: boolean; retries?: number }) => {
    if (!id) return;
    const silent = options?.silent ?? false;
    const maxRetries = options?.retries ?? 2;

    if (historyAbortRef.current) {
      historyAbortRef.current.abort();
    }
    const controller = new AbortController();
    historyAbortRef.current = controller;

    const requestTicketId = id;
    historyRequestIdRef.current = requestTicketId;

    if (!silent) setLoadingHistory(true);
    const historyUrl = 'https://functions.poehali.dev/429bf640-f15c-4a4f-b791-a7437061ba87';

    let attempt = 0;
    while (attempt <= maxRetries) {
      try {
        const response = await apiFetch(`${historyUrl}?ticket_id=${requestTicketId}`, {
          headers: {
            'X-Auth-Token': token,
          },
          signal: controller.signal,
        });

        if (historyRequestIdRef.current !== requestTicketId || controller.signal.aborted) {
          return;
        }

        if (response.ok) {
          const data = await response.json();
          if (historyRequestIdRef.current !== requestTicketId || controller.signal.aborted) {
            return;
          }
          setAuditLogs(data.logs || []);
          if (!silent) setLoadingHistory(false);
          return;
        }
        throw new Error(`HTTP ${response.status}`);
      } catch (error) {
        if (controller.signal.aborted) {
          return;
        }
        attempt += 1;
        if (attempt > maxRetries) {
          console.error('Error loading history:', error);
          if (historyRequestIdRef.current === requestTicketId && !silent) {
            setLoadingHistory(false);
          }
          return;
        }
        await new Promise((resolve) => setTimeout(resolve, 300 * attempt));
      }
    }
  };

  const loadComments = async (options?: { silent?: boolean; retries?: number }) => {
    if (!id) return;
    const silent = options?.silent ?? false;
    const maxRetries = options?.retries ?? 2;

    if (commentsAbortRef.current) {
      commentsAbortRef.current.abort();
    }
    const controller = new AbortController();
    commentsAbortRef.current = controller;

    const requestTicketId = id;
    commentsRequestIdRef.current = requestTicketId;

    if (!silent) setLoadingComments(true);
    const commentsUrl = 'https://functions.poehali.dev/5de559ba-3637-4418-aea0-26c373f191c3';

    let attempt = 0;
    while (attempt <= maxRetries) {
      try {
        const response = await apiFetch(`${commentsUrl}?ticket_id=${requestTicketId}`, {
          headers: {
            'X-Auth-Token': token,
          },
          signal: controller.signal,
        });

        if (commentsRequestIdRef.current !== requestTicketId || controller.signal.aborted) {
          return;
        }

        if (response.ok) {
          const data = await response.json();
          if (commentsRequestIdRef.current !== requestTicketId || controller.signal.aborted) {
            return;
          }
          setComments(data.comments || []);
          if (Array.isArray(data.participant_ids)) {
            setParticipantIds(data.participant_ids);
          }
          if (typeof data.my_last_seen_at === 'string' || data.my_last_seen_at === null) {
            setMyLastSeenAt(data.my_last_seen_at ?? null);
          }
          if (!silent) setLoadingComments(false);
          return;
        }
        throw new Error(`HTTP ${response.status}`);
      } catch (error) {
        if (controller.signal.aborted) {
          return;
        }
        attempt += 1;
        if (attempt > maxRetries) {
          console.error('Error loading comments:', error);
          if (commentsRequestIdRef.current === requestTicketId && !silent) {
            setLoadingComments(false);
          }
          return;
        }
        await new Promise((resolve) => setTimeout(resolve, 300 * attempt));
      }
    }
  };

  const markCommentsRead = async (commentIds: number[]) => {
    if (!commentIds.length) return;
    try {
      const commentsUrl = 'https://functions.poehali.dev/5de559ba-3637-4418-aea0-26c373f191c3';
      await apiFetch(`${commentsUrl}?action=mark-read`, {
        method: 'POST',
        headers: {
          'X-Auth-Token': token,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ comment_ids: commentIds }),
      });
    } catch (error) {
      console.error('Error marking comments read:', error);
    }
  };

  const loadExecutorGroups = async () => {
    const EXECUTOR_GROUPS_URL = 'https://functions.poehali.dev/a52eb50f-38cf-4887-aead-cc77f01ca416';
    const maxRetries = 3;
    let attempt = 0;
    while (attempt <= maxRetries) {
      try {
        const response = await apiFetch(EXECUTOR_GROUPS_URL, {
          headers: {
            'X-Auth-Token': token,
          },
        });
        if (response.ok) {
          const data = await response.json();
          setExecutorGroups(Array.isArray(data) ? data : data.groups || []);
          return;
        }
        throw new Error(`HTTP ${response.status}`);
      } catch (error) {
        attempt += 1;
        if (attempt > maxRetries) {
          console.error('Error loading executor groups:', error);
          return;
        }
        await new Promise((resolve) => setTimeout(resolve, 400 * attempt));
      }
    }
  };

  useEffect(() => {
    setComments([]);
    setAuditLogs([]);
    setParticipantIds([]);
    setMyLastSeenAt(null);

    if (id && token) {
      // Сначала — то, что нужно для немедленной отрисовки заявки.
      loadTicket();
      // Чуть разносим параллельные тяжёлые запросы, чтобы не упереться в rate-limit БД.
      loadStatuses();
      loadExecutorGroups();
      loadUsers();
      // Эти грузим с небольшой задержкой — они тяжелее и не нужны для первого экрана.
      const tComments = setTimeout(() => { loadComments(); }, 150);
      const tHistory = setTimeout(() => { loadHistory(); }, 300);

      return () => {
        clearTimeout(tComments);
        clearTimeout(tHistory);
        if (commentsAbortRef.current) {
          commentsAbortRef.current.abort();
        }
        commentsRequestIdRef.current = null;
        if (historyAbortRef.current) {
          historyAbortRef.current.abort();
        }
        historyRequestIdRef.current = null;
      };
    }

    return () => {
      if (commentsAbortRef.current) {
        commentsAbortRef.current.abort();
      }
      commentsRequestIdRef.current = null;
      if (historyAbortRef.current) {
        historyAbortRef.current.abort();
      }
      historyRequestIdRef.current = null;
    };
  }, [id, token]);

  return {
    ticket,
    statuses,
    comments,
    users,
    executorGroups,
    auditLogs,
    loading,
    loadingComments,
    loadingHistory,
    loadTicket,
    loadComments,
    loadHistory,
    participantIds,
    myLastSeenAt,
    markCommentsRead,
  };
};