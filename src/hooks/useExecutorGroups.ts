import { useState, useEffect, useCallback } from 'react';
import { apiFetch, getApiUrl } from '@/utils/api';
import { useToast } from '@/hooks/use-toast';

export interface ExecutorGroup {
  id: number;
  name: string;
  description: string;
  is_active: boolean;
  auto_assign: boolean;
  assign_group_only: boolean;
  member_count: number;
  mapping_count: number;
  created_at: string;
  updated_at: string;
}

export interface GroupMember {
  id: number;
  group_id: number;
  user_id: number;
  user_name: string;
  user_email: string;
  is_lead: boolean;
  created_at: string;
}

export interface ServiceMapping {
  id: number;
  group_id: number;
  ticket_service_id: number;
  ticket_service_name: string;
  service_id: number;
  service_name: string;
  created_at: string;
}

export interface ReferenceUser {
  id: number;
  full_name: string;
  email: string;
}

export interface ReferenceTicketService {
  id: number;
  name: string;
}

export interface ReferenceService {
  id: number;
  name: string;
}

export interface ValidCombo {
  ticket_service_id: number;
  service_id: number;
}

const API_BASE = getApiUrl('executor-groups');

export const useExecutorGroups = () => {
  const { toast } = useToast();
  const [groups, setGroups] = useState<ExecutorGroup[]>([]);
  const [loading, setLoading] = useState(true);

  const loadGroups = useCallback(async () => {
    setLoading(true);
    try {
      const res = await apiFetch(API_BASE);
      if (res.ok) {
        setGroups(await res.json());
      }
    } catch {
      toast({ title: 'Ошибка', description: 'Не удалось загрузить группы', variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  }, [toast]);

  useEffect(() => { loadGroups(); }, [loadGroups]);

  const createGroup = async (
    name: string,
    description: string,
    auto_assign = false,
    assign_group_only = false,
  ): Promise<ExecutorGroup | null> => {
    try {
      const res = await apiFetch(API_BASE, {
        method: 'POST',
        body: JSON.stringify({ name, description, auto_assign, assign_group_only }),
      });
      const data = await res.json();
      if (res.ok) {
        toast({ title: 'Группа создана' });
        await loadGroups();
        return data;
      }
      toast({ title: 'Ошибка', description: data.error, variant: 'destructive' });
    } catch {
      toast({ title: 'Ошибка', description: 'Не удалось создать группу', variant: 'destructive' });
    }
    return null;
  };

  const updateGroup = async (
    id: number,
    name: string,
    description: string,
    is_active: boolean,
    auto_assign = false,
    assign_group_only = false,
  ): Promise<boolean> => {
    try {
      const res = await apiFetch(API_BASE, {
        method: 'PUT',
        body: JSON.stringify({ id, name, description, is_active, auto_assign, assign_group_only }),
      });
      if (res.ok) {
        toast({ title: 'Группа обновлена' });
        await loadGroups();
        return true;
      }
      const data = await res.json();
      toast({ title: 'Ошибка', description: data.error, variant: 'destructive' });
    } catch {
      toast({ title: 'Ошибка', description: 'Не удалось обновить группу', variant: 'destructive' });
    }
    return false;
  };

  const removeGroup = async (id: number): Promise<boolean> => {
    try {
      const res = await apiFetch(`${API_BASE}?id=${id}`, { method: 'DELETE' });
      if (res.ok) {
        toast({ title: 'Группа удалена' });
        await loadGroups();
        return true;
      }
      const data = await res.json();
      toast({ title: 'Ошибка', description: data.error, variant: 'destructive' });
    } catch {
      toast({ title: 'Ошибка', description: 'Не удалось удалить группу', variant: 'destructive' });
    }
    return false;
  };

  return { groups, loading, loadGroups, createGroup, updateGroup, removeGroup };
};

export const useGroupMembers = (groupId: number | null) => {
  const { toast } = useToast();
  const [members, setMembers] = useState<GroupMember[]>([]);
  const [loading, setLoading] = useState(false);

  const loadMembers = useCallback(async () => {
    if (!groupId) return;
    setLoading(true);
    try {
      const res = await apiFetch(`${API_BASE}?action=members&id=${groupId}`);
      if (res.ok) setMembers(await res.json());
    } catch {
      toast({ title: 'Ошибка', description: 'Не удалось загрузить участников', variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  }, [groupId, toast]);

  useEffect(() => { loadMembers(); }, [loadMembers]);

  const addMember = async (userId: number, isLead: boolean): Promise<boolean> => {
    if (!groupId) return false;
    try {
      const res = await apiFetch(`${API_BASE}?action=members`, {
        method: 'POST',
        body: JSON.stringify({ group_id: groupId, user_id: userId, is_lead: isLead }),
      });
      if (res.ok) {
        toast({ title: 'Участник добавлен' });
        await loadMembers();
        return true;
      }
      const data = await res.json();
      toast({ title: 'Ошибка', description: data.error, variant: 'destructive' });
    } catch {
      toast({ title: 'Ошибка', description: 'Не удалось добавить участника', variant: 'destructive' });
    }
    return false;
  };

  const removeMember = async (memberId: number): Promise<boolean> => {
    try {
      const res = await apiFetch(`${API_BASE}?action=members&member_id=${memberId}`, { method: 'DELETE' });
      if (res.ok) {
        toast({ title: 'Участник удалён' });
        await loadMembers();
        return true;
      }
    } catch {
      toast({ title: 'Ошибка', description: 'Не удалось удалить участника', variant: 'destructive' });
    }
    return false;
  };

  return { members, loading, loadMembers, addMember, removeMember };
};

export const useGroupMappings = (groupId: number | null) => {
  const { toast } = useToast();
  const [mappings, setMappings] = useState<ServiceMapping[]>([]);
  const [loading, setLoading] = useState(false);

  const loadMappings = useCallback(async () => {
    if (!groupId) return;
    setLoading(true);
    try {
      const res = await apiFetch(`${API_BASE}?action=mappings&id=${groupId}`);
      if (res.ok) setMappings(await res.json());
    } catch {
      toast({ title: 'Ошибка', description: 'Не удалось загрузить привязки', variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  }, [groupId, toast]);

  useEffect(() => { loadMappings(); }, [loadMappings]);

  const addMapping = async (ticketServiceId: number, serviceId: number): Promise<boolean> => {
    if (!groupId) return false;
    try {
      const res = await apiFetch(`${API_BASE}?action=mappings`, {
        method: 'POST',
        body: JSON.stringify({ group_id: groupId, ticket_service_id: ticketServiceId, service_id: serviceId }),
      });
      if (res.ok) {
        toast({ title: 'Привязка добавлена' });
        await loadMappings();
        return true;
      }
      const data = await res.json();
      toast({ title: 'Ошибка', description: data.error, variant: 'destructive' });
    } catch {
      toast({ title: 'Ошибка', description: 'Не удалось добавить привязку', variant: 'destructive' });
    }
    return false;
  };

  const removeMapping = async (mappingId: number): Promise<boolean> => {
    try {
      const res = await apiFetch(`${API_BASE}?action=mappings&mapping_id=${mappingId}`, { method: 'DELETE' });
      if (res.ok) {
        toast({ title: 'Привязка удалена' });
        await loadMappings();
        return true;
      }
    } catch {
      toast({ title: 'Ошибка', description: 'Не удалось удалить привязку', variant: 'destructive' });
    }
    return false;
  };

  return { mappings, loading, loadMappings, addMapping, removeMapping };
};

export const useReferenceData = () => {
  const [users, setUsers] = useState<ReferenceUser[]>([]);
  const [ticketServices, setTicketServices] = useState<ReferenceTicketService[]>([]);
  const [services, setServices] = useState<ReferenceService[]>([]);
  const [validCombos, setValidCombos] = useState<ValidCombo[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      try {
        const res = await apiFetch(`${API_BASE}?action=reference`);
        if (res.ok) {
          const data = await res.json();
          setUsers(data.users);
          setTicketServices(data.ticket_services);
          setServices(data.services);
          setValidCombos(data.valid_combos);
        }
      } catch {
        console.error('Failed to load reference data');
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  const getServicesForTicketService = (ticketServiceId: number): number[] => {
    return validCombos
      .filter(c => c.ticket_service_id === ticketServiceId)
      .map(c => c.service_id);
  };

  return { users, ticketServices, services, validCombos, loading, getServicesForTicketService };
};

export default useExecutorGroups;