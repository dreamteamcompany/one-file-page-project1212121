import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { getApiUrl } from '@/utils/api';
import { PeriodType } from '../ops/useOpsDashboard';

export interface TopService {
  name: string;
  count: number;
  share: number;
}

export interface TopProblem {
  title: string;
  count: number;
}

export interface CostLevel {
  label: string;
  tone: 'high' | 'mid' | 'low';
}

export interface HighVolumeService {
  name: string;
  count: number;
  change: number;
  avg_resolve: string;
  reopened: number;
  reopened_pct: number;
}

export interface CostService {
  name: string;
  cost: CostLevel;
}

export interface DynamicsSeries {
  key: string;
  name: string;
}

export interface ServicesDashboardData {
  top_services: TopService[];
  top_problems: TopProblem[];
  dynamics: Record<string, number | string>[];
  dynamics_series: DynamicsSeries[];
  high_volume: HighVolumeService[];
  cost_services: CostService[];
}

const formatDate = (d: Date) => {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
};

export const useServicesDashboard = (period: PeriodType, dateFrom?: Date, dateTo?: Date) => {
  const { token } = useAuth();
  const [data, setData] = useState<ServicesDashboardData | null>(null);
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
      let url = `${getApiUrl('dashboard-services')}?endpoint=dashboard-services&period=${period}`;
      if (period === 'custom' && dateFrom && dateTo) {
        url += `&from_date=${formatDate(dateFrom)}&to_date=${formatDate(dateTo)}`;
      }
      const response = await fetch(url, { headers: { 'X-Auth-Token': token } });
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      const json = await response.json();
      setData(json);
    } catch (e) {
      console.error('Failed to fetch services dashboard:', e);
    } finally {
      setLoading(false);
    }
  }, [token, period, dateFrom, dateTo]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  return { data, loading, refresh: fetchData };
};

export default useServicesDashboard;
