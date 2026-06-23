import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { getApiUrl } from '@/utils/api';

export type PeriodType = 'today' | 'week' | 'month' | 'year' | 'custom';

export interface OpsKpi {
  active: number;
  new_today: number;
  overdue_sla: number;
  avg_response: string;
  avg_resolve: string;
  reopened: number;
  created_delta: number;
}

export interface OpsDynamicPoint {
  day: string;
  created: number;
  closed: number;
  open: number;
}

export interface OpsCritical {
  id: number;
  title: string;
  author: string;
  age: string;
}

export interface OpsAgeBucket {
  label: string;
  count: number;
  percent: number;
}

export interface OpsChannel {
  name: string;
  count: number;
  percent: number;
}

export interface OpsDashboardData {
  kpi: OpsKpi;
  dynamics: OpsDynamicPoint[];
  critical: OpsCritical[];
  age_buckets: OpsAgeBucket[];
  heatmap: Record<string, number>;
  heatmap_max: number;
  channels: OpsChannel[];
}

const formatDate = (d: Date) => {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
};

export const useOpsDashboard = (period: PeriodType, dateFrom?: Date, dateTo?: Date) => {
  const { token } = useAuth();
  const [data, setData] = useState<OpsDashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    if (!token) return;
    if (period === 'custom' && (!dateFrom || !dateTo)) {
      setData(null);
      setLoading(false);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      let url = `${getApiUrl('dashboard-ops')}?endpoint=dashboard-ops&period=${period}`;
      if (period === 'custom' && dateFrom && dateTo) {
        url += `&from_date=${formatDate(dateFrom)}&to_date=${formatDate(dateTo)}`;
      }
      const response = await fetch(url, { headers: { 'X-Auth-Token': token } });
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      const json = await response.json();
      setData(json);
    } catch (e) {
      console.error('Failed to fetch ops dashboard:', e);
      setError('Не удалось загрузить данные');
    } finally {
      setLoading(false);
    }
  }, [token, period, dateFrom, dateTo]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  return { data, loading, error, refresh: fetchData };
};

export default useOpsDashboard;
