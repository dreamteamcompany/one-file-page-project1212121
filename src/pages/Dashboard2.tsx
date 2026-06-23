/**
 * Страница "Аналитика" — операционный дашборд службы поддержки
 */
import { useState } from 'react';
import PageLayout from '@/components/layout/PageLayout';
import AppHeader from '@/components/layout/AppHeader';
import OperationsDashboard from '@/components/dashboard2/ops/OperationsDashboard';

const Dashboard2 = () => {
  const [menuOpen, setMenuOpen] = useState(false);

  return (
    <PageLayout menuOpen={menuOpen} setMenuOpen={setMenuOpen}>
      <AppHeader menuOpen={menuOpen} setMenuOpen={setMenuOpen} />

      <div style={{ padding: '20px 0' }}>
        <OperationsDashboard />
      </div>
    </PageLayout>
  );
};

export default Dashboard2;