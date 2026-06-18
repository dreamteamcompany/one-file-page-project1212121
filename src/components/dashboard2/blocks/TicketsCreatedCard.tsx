import { Card, CardContent } from '@/components/ui/card';
import Icon from '@/components/ui/icon';
import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { getApiUrl } from '@/utils/api';

type PeriodType = 'today' | 'week' | 'month' | 'year' | 'custom';

interface TicketsCreatedStats {
  count: number;
  prev_count: number | null;
  change_percent: number | null;
  is_increase: boolean;
}

interface TicketsCreatedCardProps {
  period: PeriodType;
  dateFrom?: Date;
  dateTo?: Date;
}

const PERIOD_LABELS: Record<PeriodType, string> = {
  today: 'за сегодня',
  week: 'за неделю',
  month: 'за месяц',
  year: 'за год',
  custom: 'за период',
};

const PREV_LABELS: Record<PeriodType, string> = {
  today: 'к вчера',
  week: 'к прошлой неделе',
  month: 'к прошлому месяцу',
  year: 'к прошлому году',
  custom: '',
};

const formatDate = (d: Date) => {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
};

const TicketsCreatedCard = ({ period, dateFrom, dateTo }: TicketsCreatedCardProps) => {
  const { token } = useAuth();
  const [stats, setStats] = useState<TicketsCreatedStats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchStats = async () => {
      if (!token) return;
      if (period === 'custom' && (!dateFrom || !dateTo)) {
        setStats(null);
        setLoading(false);
        return;
      }

      setLoading(true);
      try {
        let url = `${getApiUrl('tickets-created-stats')}?endpoint=tickets-created-stats&period=${period}`;
        if (period === 'custom' && dateFrom && dateTo) {
          url += `&from_date=${formatDate(dateFrom)}&to_date=${formatDate(dateTo)}`;
        }
        const response = await fetch(url, {
          headers: { 'X-Auth-Token': token },
        });
        const data = await response.json();
        setStats(data);
      } catch (error) {
        console.error('Failed to fetch tickets created stats:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchStats();
  }, [token, period, dateFrom, dateTo]);

  const hasChange = stats?.change_percent !== null && stats?.change_percent !== undefined;

  return (
    <Card className="h-full bg-card border border-[#7551e9]/40 border-t-4 border-t-[#7551e9]">
      <CardContent className="p-4 sm:p-6 h-full flex flex-col justify-between">
        <div className="flex justify-between items-start mb-4 sm:mb-5">
          <div>
            <div className="text-base sm:text-lg font-bold mb-2 text-foreground">Заявок создано</div>
            <div className="text-xs sm:text-sm font-medium text-muted-foreground">
              {PERIOD_LABELS[period]}
            </div>
          </div>
          <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-xl flex items-center justify-center bg-[#7551e9]/10 text-[#7551e9] border border-[#7551e9]/20">
            <Icon name="Ticket" size={18} className="sm:w-5 sm:h-5" />
          </div>
        </div>
        <div className="text-3xl sm:text-4xl font-extrabold mb-2 text-foreground">
          {loading ? '...' : (stats?.count ?? 0).toLocaleString('ru-RU')}
        </div>
        <div className="text-xs sm:text-sm font-medium mb-3 text-muted-foreground">Всего созданных заявок</div>
        {!loading && stats && hasChange && (
          <div className="flex items-center text-xs sm:text-sm font-semibold gap-1.5" style={{ color: stats.is_increase ? '#01b574' : '#e31a1a' }}>
            <Icon name={stats.is_increase ? 'ArrowUp' : 'ArrowDown'} size={14} />
            {stats.change_percent! > 0 ? '+' : ''}{stats.change_percent}% {PREV_LABELS[period]}
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default TicketsCreatedCard;