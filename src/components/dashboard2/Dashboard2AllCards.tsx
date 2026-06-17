import TicketsCreatedCard from './blocks/TicketsCreatedCard';
import AverageRatingCard from './blocks/AverageRatingCard';

type PeriodType = 'today' | 'week' | 'month' | 'year' | 'custom';

interface Dashboard2AllCardsProps {
  period: PeriodType;
  dateFrom?: Date;
  dateTo?: Date;
}

const Dashboard2AllCards = ({ period, dateFrom, dateTo }: Dashboard2AllCardsProps) => {
  return (
    <div className="mb-6 sm:mb-8 overflow-x-hidden max-w-full">
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-5">
        <div className="w-full h-[280px] sm:h-[300px]">
          <TicketsCreatedCard period={period} dateFrom={dateFrom} dateTo={dateTo} />
        </div>
        <div className="w-full h-[280px] sm:h-[300px]">
          <AverageRatingCard period={period} dateFrom={dateFrom} dateTo={dateTo} />
        </div>
      </div>
    </div>
  );
};

export default Dashboard2AllCards;
