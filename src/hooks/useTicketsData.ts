import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { API_URL, apiFetch } from '@/utils/api';
import type {
  Ticket,
  CustomField,
  TicketCategory,
  TicketPriority,
  TicketStatus,
  TicketDepartment,
  TicketService,
} from '@/types';

const TICKETS_PER_PAGE = 50;

export const useTicketsData = () => {
  const { token } = useAuth();
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [categories, setCategories] = useState<TicketCategory[]>([]);
  const [priorities, setPriorities] = useState<TicketPriority[]>([]);
  const [statuses, setStatuses] = useState<TicketStatus[]>([]);
  const [departments, setDepartments] = useState<TicketDepartment[]>([]);
  const [customFields, setCustomFields] = useState<CustomField[]>([]);
  const [services, setServices] = useState<TicketService[]>([]);
  const [ticketServices, setTicketServices] = useState<TicketService[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalTickets, setTotalTickets] = useState(0);
  const [showArchived, setShowArchived] = useState(false);
  const [showHidden, setShowHidden] = useState(false);
  const [hiddenCount, setHiddenCount] = useState(0);
  const [hideWaiting, setHideWaiting] = useState<boolean>(() => {
    const saved = localStorage.getItem('tickets_hide_waiting');
    return saved === null ? true : saved === 'true';
  });

  const loadHiddenCount = useCallback(async () => {
    if (!token) return;
    try {
      const res = await apiFetch(
        `${API_URL}?endpoint=tickets&page=1&limit=1&is_hidden=true`,
        { headers: { 'X-Auth-Token': token } }
      );
      if (res.ok) {
        const data = await res.json();
        setHiddenCount(data.total || 0);
      }
    } catch {
      // ignore
    }
  }, [token]);

  const loadTickets = useCallback(async (targetPage = 1, isArchived?: boolean, isHidden?: boolean, hideWaitingArg?: boolean) => {
    if (!token) return;

    const archived = isArchived !== undefined ? isArchived : showArchived;
    const hidden = isHidden !== undefined ? isHidden : showHidden;
    const skipWaiting = hideWaitingArg !== undefined ? hideWaitingArg : hideWaiting;
    setLoading(true);
    try {
      let url = `${API_URL}?endpoint=tickets&page=${targetPage}&limit=${TICKETS_PER_PAGE}`;
      if (hidden) {
        url += '&is_hidden=true';
      } else {
        url += `&is_archived=${archived}`;
        if (skipWaiting) {
          url += '&hide_waiting=true';
        }
      }
      const response = await apiFetch(url, { headers: { 'X-Auth-Token': token } });

      if (response.ok) {
        const data = await response.json();
        setTickets(data.tickets || []);
        setTotalPages(data.pages || 1);
        setTotalTickets(data.total || 0);
        setPage(targetPage);
      } else {
        console.error('Tickets response not OK:', response.status, await response.text());
        setTickets([]);
      }
    } catch (err) {
      console.error('Failed to load tickets:', err);
      setTickets([]);
    } finally {
      setLoading(false);
    }
  }, [token, showArchived, showHidden, hideWaiting]);

  const loadServices = useCallback(async () => {
    if (!token) return;

    try {
      const categoriesResponse = await apiFetch(`${API_URL}?endpoint=ticket_services`, {
        headers: { 'X-Auth-Token': token },
      });

      if (categoriesResponse.ok) {
        const data = await categoriesResponse.json();
        setTicketServices(data || []);
      }

      const servicesResponse = await apiFetch(`${API_URL}?endpoint=services`, {
        headers: { 'X-Auth-Token': token },
      });

      if (servicesResponse.ok) {
        const data = await servicesResponse.json();
        setServices(Array.isArray(data) ? data : []);
      }
    } catch (err) {
      console.error('Failed to load services:', err);
    }
  }, [token]);

  const loadDictionaries = useCallback(async () => {
    if (!token) return;

    try {
      const response = await apiFetch(`${API_URL}?endpoint=ticket-dictionaries-api`, {
        headers: { 'X-Auth-Token': token },
      });

      if (response.ok) {
        const data = await response.json();
        setCategories(data.categories || []);
        setPriorities(data.priorities || []);
        setStatuses(data.statuses || []);
        setDepartments(data.departments || []);
        setCustomFields(data.custom_fields || []);
      } else {
        console.error('Dictionaries response not OK:', response.status, await response.text());
        setPriorities([
          { id: 1, name: 'Низкий', level: 1, color: '#6b7280' },
          { id: 2, name: 'Средний', level: 2, color: '#3b82f6' },
          { id: 3, name: 'Высокий', level: 3, color: '#f97316' },
          { id: 4, name: 'Критический', level: 4, color: '#ef4444' }
        ]);
        setStatuses([
          { id: 1, name: 'Новая', color: '#3b82f6', is_closed: false },
          { id: 2, name: 'В работе', color: '#eab308', is_closed: false },
          { id: 3, name: 'Ожидание', color: '#f97316', is_closed: false },
          { id: 4, name: 'Решена', color: '#22c55e', is_closed: true },
          { id: 5, name: 'Закрыта', color: '#6b7280', is_closed: true }
        ]);
      }
    } catch (err) {
      console.error('Failed to load dictionaries:', err);
    }
  }, [token]);

  useEffect(() => {
    if (token) {
      setLoading(true);
      Promise.all([
        loadTickets(1),
        loadDictionaries(),
        loadServices(),
        loadHiddenCount()
      ]).finally(() => setLoading(false));
    }
  }, [token]);

  const toggleArchived = useCallback((archived: boolean) => {
    setShowArchived(archived);
    setShowHidden(false);
    setPage(1);
    loadTickets(1, archived, false);
    loadHiddenCount();
  }, [loadTickets, loadHiddenCount]);

  const toggleHidden = useCallback((hidden: boolean) => {
    setShowHidden(hidden);
    setShowArchived(false);
    setPage(1);
    loadTickets(1, false, hidden);
  }, [loadTickets]);

  const toggleHideWaiting = useCallback((value: boolean) => {
    setHideWaiting(value);
    localStorage.setItem('tickets_hide_waiting', String(value));
    setPage(1);
    loadTickets(1, undefined, undefined, value);
  }, [loadTickets]);

  return {
    tickets,
    categories,
    priorities,
    statuses,
    departments,
    customFields,
    services,
    ticketServices,
    loading,
    page,
    totalPages,
    totalTickets,
    showArchived,
    showHidden,
    hiddenCount,
    hideWaiting,
    loadTickets,
    loadDictionaries,
    loadServices,
    toggleArchived,
    toggleHidden,
    toggleHideWaiting,
    loadHiddenCount,
  };
};