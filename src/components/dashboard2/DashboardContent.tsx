/**
 * Компонент контента дашборда
 * Single Responsibility: только отображение блоков дашборда
 */
import Dashboard2AllCards from './Dashboard2AllCards';

type PeriodType = 'today' | 'week' | 'month' | 'year' | 'custom';

interface DashboardContentProps {
  period: PeriodType;
  dateFrom?: Date;
  dateTo?: Date;
}

const DashboardContent = ({ period, dateFrom, dateTo }: DashboardContentProps) => {
  return (
    <>
      <Dashboard2AllCards period={period} dateFrom={dateFrom} dateTo={dateTo} />
    </>
  );
};

export default DashboardContent;
