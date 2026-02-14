import { useState, useEffect, useCallback, useMemo } from 'react';
import { apiFetch, getApiUrl } from '@/utils/api';
import { useToast } from '@/hooks/use-toast';

export interface GroupAssignment {
  id: number;
  group_id: number;
  group_name: string;
  ticket_service_id: number;
  ticket_service_name: string;
  service_id: number;
  service_name: string;
  created_at: string;
}

export interface UserAssignment {
  id: number;
  user_id: number;
  user_name: string;
  user_email: string;
  ticket_service_id: number;
  ticket_service_name: string;
  service_id: number;
  service_name: string;
  created_at: string;
}

export interface RefTicketService {
  id: number;
  name: string;
}

export interface RefService {
  id: number;
  name: string;
}

export interface RefUser {
  id: number;
  full_name: string;
  email: string;
}

export interface RefGroup {
  id: number;
  name: string;
}

interface ValidCombo {
  ticket_service_id: number;
  service_id: number;
}

const API_BASE = getApiUrl('executor-assignments');

export const useAssignments = () => {
  const { toast } = useToast();
  const [groupAssignments, setGroupAssignments] = useState<GroupAssignment[]>([]);
  const [userAssignments, setUserAssignments] = useState<UserAssignment[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await apiFetch(API_BASE);
      if (res.ok) {
        const data = await res.json();
        setGroupAssignments(data.group_assignments ?? []);
        setUserAssignments(data.user_assignments ?? []);
      }
    } catch {
      toast({ title: 'Ошибка', description: 'Не удалось загрузить привязки', variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  }, [toast]);

  useEffect(() => { load(); }, [load]);

  const addGroupAssignment = async (
    groupId: number,
    ticketServiceId: number,
    serviceId: number,
  ): Promise<boolean> => {
    try {
      const res = await apiFetch(`${API_BASE}?action=group`, {
        method: 'POST',
        body: JSON.stringify({
          group_id: groupId,
          ticket_service_id: ticketServiceId,
          service_id: serviceId,
        }),
      });
      if (res.ok) {
        toast({ title: 'Группа привязана' });
        await load();
        return true;
      }
      const data = await res.json();
      toast({ title: 'Ошибка', description: data.error, variant: 'destructive' });
    } catch {
      toast({ title: 'Ошибка', description: 'Не удалось добавить привязку', variant: 'destructive' });
    }
    return false;
  };

  const addUserAssignment = async (
    userId: number,
    ticketServiceId: number,
    serviceId: number,
  ): Promise<boolean> => {
    try {
      const res = await apiFetch(`${API_BASE}?action=user`, {
        method: 'POST',
        body: JSON.stringify({
          user_id: userId,
          ticket_service_id: ticketServiceId,
          service_id: serviceId,
        }),
      });
      if (res.ok) {
        toast({ title: 'Исполнитель привязан' });
        await load();
        return true;
      }
      const data = await res.json();
      toast({ title: 'Ошибка', description: data.error, variant: 'destructive' });
    } catch {
      toast({ title: 'Ошибка', description: 'Не удалось добавить привязку', variant: 'destructive' });
    }
    return false;
  };

  const removeGroupAssignment = async (id: number): Promise<boolean> => {
    try {
      const res = await apiFetch(`${API_BASE}?action=group&id=${id}`, { method: 'DELETE' });
      if (res.ok) {
        toast({ title: 'Привязка группы удалена' });
        await load();
        return true;
      }
    } catch {
      toast({ title: 'Ошибка', description: 'Не удалось удалить привязку', variant: 'destructive' });
    }
    return false;
  };

  const removeUserAssignment = async (id: number): Promise<boolean> => {
    try {
      const res = await apiFetch(`${API_BASE}?action=user&id=${id}`, { method: 'DELETE' });
      if (res.ok) {
        toast({ title: 'Привязка исполнителя удалена' });
        await load();
        return true;
      }
    } catch {
      toast({ title: 'Ошибка', description: 'Не удалось удалить привязку', variant: 'destructive' });
    }
    return false;
  };

  return {
    groupAssignments,
    userAssignments,
    loading,
    addGroupAssignment,
    addUserAssignment,
    removeGroupAssignment,
    removeUserAssignment,
  };
};

export const useAssignmentReference = () => {
  const [users, setUsers] = useState<RefUser[]>([]);
  const [ticketServices, setTicketServices] = useState<RefTicketService[]>([]);
  const [services, setServices] = useState<RefService[]>([]);
  const [groups, setGroups] = useState<RefGroup[]>([]);
  const [validCombos, setValidCombos] = useState<ValidCombo[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchRef = async () => {
      try {
        const res = await apiFetch(`${API_BASE}?action=reference`);
        if (res.ok) {
          const data = await res.json();
          setUsers(data.users ?? []);
          setTicketServices(data.ticket_services ?? []);
          setServices(data.services ?? []);
          setGroups(data.groups ?? []);
          setValidCombos(data.valid_combos ?? []);
        }
      } finally {
        setLoading(false);
      }
    };
    fetchRef();
  }, []);

  const getServicesForTicketService = useCallback(
    (ticketServiceId: number): number[] => {
      const ids = validCombos
        .filter(c => c.ticket_service_id === ticketServiceId)
        .map(c => c.service_id);
      return ids;
    },
    [validCombos],
  );

  const filteredServices = useMemo(
    () => (ticketServiceId: number) => {
      const validIds = getServicesForTicketService(ticketServiceId);
      if (validIds.length === 0) return services;
      return services.filter(s => validIds.includes(s.id));
    },
    [services, getServicesForTicketService],
  );

  return {
    users,
    ticketServices,
    services,
    groups,
    loading,
    getServicesForTicketService,
    filteredServices,
  };
};
