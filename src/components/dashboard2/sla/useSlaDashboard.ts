import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { getApiUrl } from '@/utils/api';
import { PeriodType } from '../ops/useOpsDashboard';

export interface TrendPoint {
  i: number;
  v: number;
}

export interface SlaDashboardData {
  sla_compliance: { value: number; delta: number; is_increase: boolean };
  sla_split: { on_time: number; on_time_pct: number; overdue: number; overdue_pct: number };
  sla_by_priority: { name: string; percent: number; color: string }[];
  overdue_total: { value: number; delta: number; is_increase: boolean };
  first_response: { value: string; delta: string; is_increase: boolean; trend: TrendPoint[] };
  resolution: { value: string; delta: string; is_increase: boolean; trend: TrendPoint[] };
  overdue_trend: TrendPoint[];
  csat: { value: number; delta: number; is_increase: boolean };
  csat_histogram: { star: number; count: number }[];
  rating_total: number;
  rating_distribution: { star: number; count: number; percent: number }[];
}

const formatDate = (d: Date) => {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
};

export const useSlaDashboard = (period: PeriodType, dateFrom?: Date, dateTo?: Date) => {
  const { token } = useAuth();
  const [data, setData] = useState<SlaDashboardData | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchData = useCallback(async () => {
    if (!token) return;
    if (period === 'custom' && (!dateFrom || !dateTo)) {
      setData(null);
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      let url = `${getApiUrl('dashboard-sla')}?endpoint=dashboard-sla&period=${period}`;
      if (period === 'custom' && dateFrom && dateTo) {
        url += `&from_date=${formatDate(dateFrom)}&to_date=${formatDate(dateTo)}`;
      }
      const response = await fetch(url, { headers: { 'X-Auth-Token': token } });
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      const json = await response.json();
      setData(json);
    } catch (e) {
      console.error('Failed to fetch sla dashboard:', e);
    } finally {
      setLoading(false);
    }
  }, [token, period, dateFrom, dateTo]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  return { data, loading, refresh: fetchData };
};

export default useSlaDashboard;
