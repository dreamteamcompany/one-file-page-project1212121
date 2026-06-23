import { useState } from 'react';
import OpsHeader from '../ops/OpsHeader';
import { PeriodType } from '../ops/useOpsDashboard';
import SlaTopRow from './SlaTopRow';
import SlaMetricCard from './SlaMetricCard';
import SlaCsatCard from './SlaCsatCard';
import SlaRatingDistribution from './SlaRatingDistribution';
import { useSlaDashboard } from './useSlaDashboard';

const SlaDashboard = () => {
  const [period, setPeriod] = useState<PeriodType>('month');
  const [dateFrom, setDateFrom] = useState<Date>();
  const [dateTo, setDateTo] = useState<Date>();

  const { data, loading, refresh } = useSlaDashboard(period, dateFrom, dateTo);

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
        title="2. SLA и качество"
        subtitle="Контроль качества и соблюдения SLA"
      />

      <SlaTopRow data={data} loading={loading} />

      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
        <SlaMetricCard
          title="Среднее время первого ответа"
          value={data?.first_response.value ?? '—'}
          delta={data?.first_response.delta ?? ''}
          isIncrease={data?.first_response.is_increase ?? false}
          trend={data?.first_response.trend ?? []}
          color="#6366f1"
          loading={loading}
        />
        <SlaMetricCard
          title="Среднее время решения"
          value={data?.resolution.value ?? '—'}
          delta={data?.resolution.delta ?? ''}
          isIncrease={data?.resolution.is_increase ?? false}
          trend={data?.resolution.trend ?? []}
          color="#8b5cf6"
          loading={loading}
        />
        <SlaMetricCard
          title="Просроченные заявки"
          value={String(data?.overdue_total.value ?? '—')}
          delta={`${data?.overdue_total.delta ?? ''} к вчерашнему дню`}
          isIncrease={data?.overdue_total.is_increase ?? false}
          trend={data?.overdue_trend ?? []}
          color="#ef4444"
          loading={loading}
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        <SlaCsatCard data={data} loading={loading} />
        <SlaRatingDistribution data={data} loading={loading} />
      </div>
    </div>
  );
};

export default SlaDashboard;
