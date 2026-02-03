import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { API_URL, apiFetch } from '@/utils/api';
import type { Ticket, TicketComment, TicketAuditLog, TicketStatus, User } from '@/types';

export const useTicketData = (id: string | undefined, initialTicket: Ticket | null = null) => {
  const { token } = useAuth();
  const [ticket, setTicket] = useState<Ticket | null>(initialTicket);
  const [statuses, setStatuses] = useState<TicketStatus[]>([]);
  const [comments, setComments] = useState<TicketComment[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [auditLogs, setAuditLogs] = useState<TicketAuditLog[]>([]);
  const [loading, setLoading] = useState(false);
  const [loadingComments, setLoadingComments] = useState(false);
  const [loadingHistory, setLoadingHistory] = useState(false);

  const loadTicket = async () => {
    try {
      setLoading(true);
      const response = await apiFetch(`${API_URL}?endpoint=tickets`, {
        headers: {
          'X-Auth-Token': token,
        },
      });
      if (response.ok) {
        const data = await response.json();
        const foundTicket = data.tickets?.find((t: Ticket) => t.id === Number(id));
        if (foundTicket) {
          setTicket(foundTicket);
        }
      }
    } catch (error) {
      console.error('Error loading ticket:', error);
    } finally {
      setLoading(false);
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
          role: ''
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
      }
    } catch (error) {
      console.error('Error loading comments:', error);
    } finally {
      setLoadingComments(false);
    }
  };

  useEffect(() => {
    if (id && token) {
      loadTicket();
      loadStatuses();
      loadComments();
      loadUsers();
      loadHistory();
    }
  }, [id, token]);

  return {
    ticket,
    statuses,
    comments,
    users,
    auditLogs,
    loading,
    loadingComments,
    loadingHistory,
    loadTicket,
    loadComments,
    loadHistory,
  };
};