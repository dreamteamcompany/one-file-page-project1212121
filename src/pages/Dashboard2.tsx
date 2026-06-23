/**
 * Страница "Аналитика" — операционный дашборд службы поддержки
 */
import { useState } from 'react';
import PageLayout from '@/components/layout/PageLayout';
import AppHeader from '@/components/layout/AppHeader';
import DashboardSwitcher, { DashboardId } from '@/components/dashboard2/ops/DashboardSwitcher';
import OperationsDashboard from '@/components/dashboard2/ops/OperationsDashboard';
import SlaDashboard from '@/components/dashboard2/sla/SlaDashboard';

const Dashboard2 = () => {
  const [menuOpen, setMenuOpen] = useState(false);
  const [activeDashboard, setActiveDashboard] = useState<DashboardId>('operations');

  return (
    <PageLayout menuOpen={menuOpen} setMenuOpen={setMenuOpen}>
      <AppHeader menuOpen={menuOpen} setMenuOpen={setMenuOpen} />

      <div style={{ padding: '20px 0' }} className="flex flex-col gap-5">
        <DashboardSwitcher active={activeDashboard} onChange={setActiveDashboard} />
        {activeDashboard === 'operations' && <OperationsDashboard />}
        {activeDashboard === 'sla' && <SlaDashboard />}
      </div>
    </PageLayout>
  );
};

export default Dashboard2;