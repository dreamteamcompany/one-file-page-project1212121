import { useState } from 'react';
import OpsHeader from '../ops/OpsHeader';
import { PeriodType } from '../ops/useOpsDashboard';
import ServicesTopRow from './ServicesTopRow';
import ServicesBottomRow from './ServicesBottomRow';
import { useServicesDashboard } from './useServicesDashboard';

const ServicesDashboard = () => {
  const [period, setPeriod] = useState<PeriodType>('month');
  const [dateFrom, setDateFrom] = useState<Date>();
  const [dateTo, setDateTo] = useState<Date>();

  const { data, loading, refresh } = useServicesDashboard(period, dateFrom, dateTo);

  return (
    <div className="flex flex-col gap-5 w-full">
      <OpsHeader
        period={period}
        onPeriodChange={setPeriod}
        dateFrom={dateFrom}
        dateTo={dateTo}
        onDateFromChange={setDateFrom}
        onDateToChange={setDateTo}
        onRefresh={refresh}
        loading={loading}
        title="3. Аналитика услуг"
        subtitle="Анализ обращений по услугам и типам проблем"
      />

      <ServicesTopRow data={data} loading={loading} />
      <ServicesBottomRow data={data} loading={loading} />
    </div>
  );
};

export default ServicesDashboard;
