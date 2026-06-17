import { Card, CardContent } from '@/components/ui/card';
import Icon from '@/components/ui/icon';
import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { getApiUrl } from '@/utils/api';

type PeriodType = 'today' | 'week' | 'month' | 'year' | 'custom';

interface RatingStats {
  avg_rating: number;
  rated_count: number;
}

interface AverageRatingCardProps {
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

const formatDate = (d: Date) => {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
};

const Stars = ({ value }: { value: number }) => {
  const stars = [];
  for (let i = 1; i <= 5; i++) {
    let fill = 0;
    if (value >= i) fill = 1;
    else if (value > i - 1) fill = value - (i - 1);

    stars.push(
      <div key={i} className="relative">
        <Icon name="Star" size={26} style={{ color: 'rgba(255,255,255,0.18)' }} />
        {fill > 0 && (
          <div className="absolute top-0 left-0 overflow-hidden" style={{ width: `${fill * 100}%` }}>
            <Icon name="Star" size={26} style={{ color: '#ffb547', fill: '#ffb547' }} />
          </div>
        )}
      </div>
    );
  }
  return <div className="flex gap-1">{stars}</div>;
};

const AverageRatingCard = ({ period, dateFrom, dateTo }: AverageRatingCardProps) => {
  const { token } = useAuth();
  const [stats, setStats] = useState<RatingStats | null>(null);
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
        let url = `${getApiUrl('tickets-rating-stats')}?endpoint=tickets-rating-stats&period=${period}`;
        if (period === 'custom' && dateFrom && dateTo) {
          url += `&from_date=${formatDate(dateFrom)}&to_date=${formatDate(dateTo)}`;
        }
        const response = await fetch(url, {
          headers: { 'X-Auth-Token': token },
        });
        const data = await response.json();
        setStats(data);
      } catch (error) {
        console.error('Failed to fetch rating stats:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchStats();
  }, [token, period, dateFrom, dateTo]);

  const avg = stats?.avg_rating ?? 0;

  return (
    <Card className="h-full" style={{ background: '#111c44', border: '1px solid rgba(255, 181, 71, 0.4)', borderTop: '4px solid #ffb547', boxShadow: '0 0 30px rgba(255, 181, 71, 0.18), inset 0 0 15px rgba(255, 181, 71, 0.05)' }}>
      <CardContent className="p-4 sm:p-6 h-full flex flex-col justify-between">
        <div className="flex justify-between items-start mb-4 sm:mb-5">
          <div>
            <div className="text-base sm:text-lg font-bold mb-2" style={{ color: '#fff' }}>Средняя оценка</div>
            <div className="text-xs sm:text-sm font-medium" style={{ color: '#a3aed0' }}>
              {PERIOD_LABELS[period]}
            </div>
          </div>
          <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-xl flex items-center justify-center" style={{ background: 'rgba(255, 181, 71, 0.1)', color: '#ffb547', border: '1px solid rgba(255, 181, 71, 0.2)' }}>
            <Icon name="Star" size={18} className="sm:w-5 sm:h-5" />
          </div>
        </div>
        <div className="text-3xl sm:text-4xl font-extrabold mb-3" style={{ color: '#fff' }}>
          {loading ? '...' : avg > 0 ? avg.toFixed(2) : '—'}
        </div>
        <div className="mb-3">
          <Stars value={avg} />
        </div>
        <div className="text-xs sm:text-sm font-medium" style={{ color: '#a3aed0' }}>
          {loading ? 'Загрузка...' : `${stats?.rated_count ?? 0} оценок`}
        </div>
      </CardContent>
    </Card>
  );
};

export default AverageRatingCard;
