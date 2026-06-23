import { useState } from 'react';
import DashboardSwitcher, { DashboardId } from './DashboardSwitcher';
import OpsHeader from './OpsHeader';
import OpsKpiCards from './OpsKpiCards';
import OpsDynamicsChart from './OpsDynamicsChart';
import OpsCriticalList from './OpsCriticalList';
import OpsAgeBuckets from './OpsAgeBuckets';
import OpsHeatmap from './OpsHeatmap';
import OpsChannelsDonut from './OpsChannelsDonut';
import { useOpsDashboard, PeriodType } from './useOpsDashboard';

const OperationsDashboard = () => {
  const [period, setPeriod] = useState<PeriodType>('month');
  const [dateFrom, setDateFrom] = useState<Date>();
  const [dateTo, setDateTo] = useState<Date>();
  const [activeDashboard, setActiveDashboard] = useState<DashboardId>('operations');

  const { data, loading, refresh } = useOpsDashboard(period, dateFrom, dateTo);

  return (
    <div className="flex flex-col gap-5 w-full">
      <DashboardSwitcher active={activeDashboard} onChange={setActiveDashboard} />

      <OpsHeader
        period={period}
        onPeriodChange={setPeriod}
        dateFrom={dateFrom}
        dateTo={dateTo}
        onDateFromChange={setDateFrom}
        onDateToChange={setDateTo}
        onRefresh={refresh}
        loading={loading}
      />

      <OpsKpiCards kpi={data?.kpi} loading={loading} />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        <div className="lg:col-span-2">
          <OpsDynamicsChart data={data?.dynamics} loading={loading} />
        </div>
        <div className="lg:col-span-1">
          <OpsCriticalList items={data?.critical} loading={loading} />
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        <OpsAgeBuckets buckets={data?.age_buckets} loading={loading} />
        <OpsHeatmap heatmap={data?.heatmap} max={data?.heatmap_max} loading={loading} />
        <OpsChannelsDonut channels={data?.channels} loading={loading} />
      </div>
    </div>
  );
};

export default OperationsDashboard;