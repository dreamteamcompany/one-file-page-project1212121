import { useState, useEffect } from 'react';
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
    try {
      const response = await apiFetch(`${API_URL}?endpoint=ticket-dictionaries-api`, {
        headers: {
          'X-Auth-Token': token,
        },
      });
      if (response.ok) {
        const data = await response.json();
        setStatuses(data.statuses || []);
      }
    } catch (error) {
      console.error('Error loading statuses:', error);
    }
  };

  const loadUsers = async () => {
    try {
      const response = await apiFetch(`${API_URL}?endpoint=users`, {
        headers: {
          'X-Auth-Token': token,
        },
      });
      if (response.ok) {
        const data = await response.json();
        const adaptedUsers = Array.isArray(data) ? data.map((u: any) => ({
          id: u.id,
          name: u.full_name || u.username,
          email: u.username,
          role: '',
          photo_url: u.photo_url || ''
        })) : [];
        setUsers(adaptedUsers);
      }
    } catch (error) {
      console.error('Error loading users:', error);
    }
  };

  const loadHistory = async () => {
    try {
      setLoadingHistory(true);
      const historyUrl = 'https://functions.poehali.dev/429bf640-f15c-4a4f-b791-a7437061ba87';
      const response = await apiFetch(`${historyUrl}?ticket_id=${id}`, {
        headers: {
          'X-Auth-Token': token,
        },
      });
      if (response.ok) {
        const data = await response.json();
        setAuditLogs(data.logs || []);
      }
    } catch (error) {
      console.error('Error loading history:', error);
    } finally {
      setLoadingHistory(false);
    }
  };

  const loadComments = async () => {
    try {
      setLoadingComments(true);
      const commentsUrl = 'https://functions.poehali.dev/5de559ba-3637-4418-aea0-26c373f191c3';
      const response = await apiFetch(`${commentsUrl}?ticket_id=${id}`, {
        headers: {
          'X-Auth-Token': token,
        },
      });
      if (response.ok) {
        const data = await response.json();
        setComments(data.comments || []);
        if (Array.isArray(data.participant_ids)) {
          setParticipantIds(data.participant_ids);
        }
        if (typeof data.my_last_seen_at === 'string' || data.my_last_seen_at === null) {
          setMyLastSeenAt(data.my_last_seen_at ?? null);
        }
      }
    } catch (error) {
      console.error('Error loading comments:', error);
    } finally {
      setLoadingComments(false);
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
    try {
      const EXECUTOR_GROUPS_URL = 'https://functions.poehali.dev/a52eb50f-38cf-4887-aead-cc77f01ca416';
      const response = await apiFetch(EXECUTOR_GROUPS_URL, {
        headers: {
          'X-Auth-Token': token,
        },
      });
      if (response.ok) {
        const data = await response.json();
        setExecutorGroups(Array.isArray(data) ? data : data.groups || []);
      }
    } catch (error) {
      console.error('Error loading executor groups:', error);
    }
  };

  useEffect(() => {
    if (id && token) {
      loadTicket();
      loadStatuses();
      loadComments();
      loadUsers();
      loadHistory();
      loadExecutorGroups();
    }
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