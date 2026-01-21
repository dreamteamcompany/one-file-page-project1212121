/**
 * Компонент контента дашборда
 * Single Responsibility: только отображение блоков дашборда
 */
import Dashboard2AllCards from './Dashboard2AllCards';
import Dashboard2BudgetBreakdown from './Dashboard2BudgetBreakdown';
import Dashboard2Charts from './Dashboard2Charts';
import Dashboard2Table from './Dashboard2Table';

const DashboardContent = () => {
  return (
    <>
      <Dashboard2AllCards />
      <Dashboard2BudgetBreakdown />
      <Dashboard2Charts />
      <Dashboard2Table />
    </>
  );
};

export default DashboardContent;
