/**
 * Хук для управления периодом фильтрации на дашборде
 * Single Responsibility: только управление периодом
 */
import { useState } from 'react';

type PeriodType = 'today' | 'week' | 'month' | 'year' | 'custom';

export const useDashboardPeriod = () => {
  const [selectedPeriod, setSelectedPeriod] = useState<PeriodType>('month');
  const [dateFrom, setDateFrom] = useState<Date>();
  const [dateTo, setDateTo] = useState<Date>();

  const isCustomPeriod = selectedPeriod === 'custom';

  return {
    selectedPeriod,
    setSelectedPeriod,
    dateFrom,
    setDateFrom,
    dateTo,
    setDateTo,
    isCustomPeriod
  };
};
