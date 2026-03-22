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

export function isUserOnShift(schedules: ScheduleEntry[]): boolean {
  const now = new Date();
  const mskOffset = 3 * 60;
  const msk = new Date(now.getTime() + (mskOffset + now.getTimezoneOffset()) * 60000);
  const day = msk.getDay() === 0 ? 6 : msk.getDay() - 1;
  const timeStr = msk.toTimeString().slice(0, 5);

  const todaySchedule = schedules.find(s => s.day_of_week === day && s.is_active);
  if (!todaySchedule) return false;

  return timeStr >= todaySchedule.start_time.slice(0, 5) && timeStr < todaySchedule.end_time.slice(0, 5);
}

export const useMemberSchedules = (userIds: number[]) => {
  const [scheduleMap, setScheduleMap] = useState<Record<number, ScheduleEntry[]>>({});
  const [loaded, setLoaded] = useState(false);

  const idsKey = userIds.sort().join(',');

  const load = useCallback(async () => {
    if (userIds.length === 0) {
      setScheduleMap({});
      setLoaded(true);
      return;
    }
    try {
      const res = await apiFetch(API_BASE);
      if (res.ok) {
        const data = await res.json();
        const map: Record<number, ScheduleEntry[]> = {};
        const idsSet = new Set(userIds);
        for (const u of (data.users_with_schedules || []) as UserWithSchedule[]) {
          if (idsSet.has(u.user_id)) {
            map[u.user_id] = u.schedules;
          }
        }
        setScheduleMap(map);
      }
    } catch {
      // ignore
    } finally {
      setLoaded(true);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [idsKey]);

  useEffect(() => { load(); }, [load]);

  return { scheduleMap, loaded };
};

export default useWorkSchedules;