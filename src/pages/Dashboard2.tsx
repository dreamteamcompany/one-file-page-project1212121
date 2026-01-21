/**
 * Страница Dashboard2
 * Рефакторинг: разделено по Single Responsibility Principle
 * - Управление периодом вынесено в хук useDashboardPeriod
 * - UI селектора периода в DashboardPeriodSelector
 * - Контент дашборда в DashboardContent
 */
import { useState } from 'react';
import PageLayout from '@/components/layout/PageLayout';
import AppHeader from '@/components/layout/AppHeader';
import DashboardPeriodSelector from '@/components/dashboard2/DashboardPeriodSelector';
import DashboardContent from '@/components/dashboard2/DashboardContent';
import { useDashboardPeriod } from '@/hooks/useDashboardPeriod';
import { Chart, registerables } from 'chart.js';

Chart.register(...registerables);

const Dashboard2 = () => {
  const [menuOpen, setMenuOpen] = useState(false);
  const {
    selectedPeriod,
    setSelectedPeriod,
    dateFrom,
    setDateFrom,
    dateTo,
    setDateTo
  } = useDashboardPeriod();

  return (
    <PageLayout menuOpen={menuOpen} setMenuOpen={setMenuOpen}>
      <AppHeader menuOpen={menuOpen} setMenuOpen={setMenuOpen} />

      <div style={{ padding: '20px 0' }}>
        <DashboardPeriodSelector
          selectedPeriod={selectedPeriod}
          onPeriodChange={setSelectedPeriod}
          dateFrom={dateFrom}
          dateTo={dateTo}
          onDateFromChange={setDateFrom}
          onDateToChange={setDateTo}
        >
          <DashboardContent />
        </DashboardPeriodSelector>
      </div>
    </PageLayout>
  );
};

export default Dashboard2;