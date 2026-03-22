import { useState, useEffect, useCallback } from 'react';
import { apiFetch, getApiUrl } from '@/utils/api';
import { useToast } from '@/hooks/use-toast';

export interface ScheduleEntry {
  id?: number;
  day_of_week: number;
  start_time: string;
  end_time: string;
  is_active: boolean;
}

export interface UserWithSchedule {
  user_id: number;
  user_name: string;
  user_email: string;
  schedules: ScheduleEntry[];
}

export interface ScheduleUser {
  id: number;
  full_name: string;
  email: string;
}

const API_BASE = getApiUrl('work-schedules');

export const useWorkSchedules = () => {
  const { toast } = useToast();
  const [usersWithSchedules, setUsersWithSchedules] = useState<UserWithSchedule[]>([]);
  const [allUsers, setAllUsers] = useState<ScheduleUser[]>([]);
  const [loading, setLoading] = useState(true);

  const loadSchedules = useCallback(async () => {
    setLoading(true);
    try {
      const res = await apiFetch(API_BASE);
      if (res.ok) {
        const data = await res.json();
        setUsersWithSchedules(data.users_with_schedules || []);
        setAllUsers(data.all_users || []);
      }
    } catch {
      toast({ title: 'Ошибка', description: 'Не удалось загрузить графики', variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  }, [toast]);

  useEffect(() => { loadSchedules(); }, [loadSchedules]);

  const saveSchedule = async (userId: number, schedules: ScheduleEntry[]): Promise<boolean> => {
    try {
      const res = await apiFetch(API_BASE, {
        method: 'POST',
        body: JSON.stringify({ user_id: userId, schedules }),
      });
      if (res.ok) {
        toast({ title: 'График сохранён' });
        await loadSchedules();
        return true;
      }
      const data = await res.json();
      toast({ title: 'Ошибка', description: data.error, variant: 'destructive' });
    } catch {
      toast({ title: 'Ошибка', description: 'Не удалось сохранить график', variant: 'destructive' });
    }
    return false;
  };

  const deleteSchedule = async (userId: number): Promise<boolean> => {
    try {
      const res = await apiFetch(`${API_BASE}?user_id=${userId}`, { method: 'DELETE' });
      if (res.ok) {
        toast({ title: 'График удалён' });
        await loadSchedules();
        return true;
      }
    } catch {
      toast({ title: 'Ошибка', description: 'Не удалось удалить график', variant: 'destructive' });
    }
    return false;
  };

  return { usersWithSchedules, allUsers, loading, loadSchedules, saveSchedule, deleteSchedule };
};

export default useWorkSchedules;
