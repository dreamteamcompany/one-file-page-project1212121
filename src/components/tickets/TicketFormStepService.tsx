import { useMemo, useState } from 'react';
import { Button } from '@/components/ui/button';
import Icon from '@/components/ui/icon';
import { Input } from '@/components/ui/input';

interface Service {
  id: number;
  name: string;
  description?: string;
  service_ids?: number[];
}

interface TicketFormStepServiceProps {
  ticketServices: Service[];
  selectedTicketServiceId: string;
  onChangeTicketService: (serviceId: number) => void;
  onNext: () => void;
  onBack: () => void;
  isFirstStep?: boolean;
}

const PAGE_SIZE = 12;

const getServiceIcon = (name: string): string => {
  const n = name.toLowerCase();
  if (n.includes('ошеломл') || n.includes('пошло не так') || n.includes('сломал')) return 'Zap';
  if (n.includes('аналит') || n.includes('отчет') || n.includes('отчёт')) return 'BarChart3';
  if (n.includes('домен')) return 'Globe';
  if (n.includes('разблок')) return 'UserCog';
  if (n.includes('заблок')) return 'Lock';
  if (n.includes('измен') && n.includes('прав')) return 'UserCog';
  if (n.includes('оплат') || n.includes('продлен') || n.includes('счет') || n.includes('лиценз')) return 'CreditCard';
  if (n.includes('предостав') && n.includes('доступ')) return 'UserPlus';
  if (n.includes('права') || n.includes('доступ')) return 'ShieldCheck';
  if (n.includes('сервер') || n.includes('банк')) return 'Server';
  if (n.includes('сим') || n.includes('sim') || n.includes('карт')) return 'CreditCard';
  if (n.includes('проблем') || n.includes('неисправ') || n.includes('ошибк') || n.includes('баг')) return 'AlertTriangle';
  if (n.includes('вопрос') || n.includes('консультац')) return 'HelpCircle';
  if (n.includes('предлож') || n.includes('идея') || n.includes('идею')) return 'Lightbulb';
  if (n.includes('жалоб')) return 'AlertCircle';
  if (n.includes('другое') || n.includes('другая')) return 'MessageCircle';
  if (n.includes('синхрон')) return 'RefreshCw';
  if (n.includes('регистр') || n.includes('приложен')) return 'Smartphone';
  return 'Wrench';
};

const TicketFormStepService = ({
  ticketServices,
  selectedTicketServiceId,
  onChangeTicketService,
  onNext,
  onBack,
  isFirstStep,
}: TicketFormStepServiceProps) => {
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return ticketServices;
    return ticketServices.filter(
      (s) =>
        s.name.toLowerCase().includes(q) ||
        (s.description || '').toLowerCase().includes(q),
    );
  }, [ticketServices, search]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const currentPage = Math.min(page, totalPages);
  const start = (currentPage - 1) * PAGE_SIZE;
  const pageItems = filtered.slice(start, start + PAGE_SIZE);
  const rangeFrom = filtered.length === 0 ? 0 : start + 1;
  const rangeTo = Math.min(start + PAGE_SIZE, filtered.length);

  const handleSearch = (value: string) => {
    setSearch(value);
    setPage(1);
  };

  return (
    <div className="space-y-5 mt-2">
      <div className="flex items-center gap-3">
        <div className="relative flex-1">
          <Icon
            name="Search"
            size={18}
            className="absolute left-3.5 top-1/2 -translate-y-1/2 text-muted-foreground"
          />
          <Input
            value={search}
            onChange={(e) => handleSearch(e.target.value)}
            placeholder="Поиск по услугам..."
            className="h-12 rounded-xl pl-11 text-sm"
          />
        </div>
        <Button
          type="button"
          variant="outline"
          className="h-12 rounded-xl gap-2 px-5 text-muted-foreground"
        >
          <Icon name="SlidersHorizontal" size={18} />
          Фильтры
        </Button>
      </div>

      <div className="space-y-3">
        <h3 className="text-lg font-semibold">Выберите услугу</h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          {pageItems.map((service) => {
            const isSelected = selectedTicketServiceId === service.id.toString();
            return (
              <button
                type="button"
                key={service.id}
                onClick={() => onChangeTicketService(service.id)}
                className={`group relative flex items-center lg:items-start gap-2.5 lg:gap-2 text-left rounded-2xl border px-2.5 py-2 pr-10 lg:pr-2.5 transition-all duration-150 ${
                  isSelected
                    ? 'border-primary border-2 bg-primary/[0.04] shadow-sm'
                    : 'border-border bg-card hover:border-primary/40 hover:shadow-md'
                }`}
              >
                <div
                  className={`flex h-7 w-7 lg:h-6 lg:w-6 shrink-0 items-center justify-center rounded-lg transition-colors ${
                    isSelected ? 'bg-primary/20 text-primary' : 'bg-primary/10 text-primary'
                  }`}
                >
                  <Icon name={getServiceIcon(service.name)} size={15} className="lg:hidden" />
                  <Icon name={getServiceIcon(service.name)} size={14} className="hidden lg:block" />
                </div>
                <div className="min-w-0 flex-1 lg:pr-4">
                  <p className="text-sm lg:text-[13px] font-semibold leading-tight text-foreground">
                    {service.name}
                  </p>
                  {service.description && (
                    <p className="mt-0.5 text-xs lg:text-[11px] leading-snug text-muted-foreground line-clamp-2">
                      {service.description}
                    </p>
                  )}
                </div>
                {isSelected ? (
                  <div className="absolute right-3 top-1/2 -translate-y-1/2 lg:right-2.5 lg:top-2.5 lg:translate-y-0 flex h-5 w-5 lg:h-4 lg:w-4 items-center justify-center rounded-full bg-primary">
                    <Icon name="Check" size={12} className="text-primary-foreground lg:hidden" />
                    <Icon name="Check" size={10} className="text-primary-foreground hidden lg:block" />
                  </div>
                ) : (
                  <Icon
                    name="ChevronRight"
                    size={18}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground/50 lg:hidden"
                  />
                )}
              </button>
            );
          })}

          <button
            type="button"
            onClick={onBack}
            className="group flex items-center lg:items-start gap-2.5 lg:gap-2 text-left rounded-2xl border border-primary/20 bg-primary/[0.06] px-2.5 py-2 transition-all duration-150 hover:border-primary/40 hover:bg-primary/10"
          >
            <div className="flex h-7 w-7 lg:h-6 lg:w-6 shrink-0 items-center justify-center rounded-lg bg-primary/15 text-primary">
              <Icon name="Headset" size={15} className="lg:hidden" />
              <Icon name="Headset" size={14} className="hidden lg:block" />
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-sm lg:text-[13px] font-semibold leading-tight text-primary">
                Не нашли нужную услугу?
              </p>
              <p className="mt-0.5 text-xs lg:text-[11px] leading-snug text-muted-foreground">
                Мы поможем вам
              </p>
            </div>
          </button>
        </div>
      </div>

      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">
          Показано {rangeFrom}–{rangeTo} из {filtered.length} услуг
        </p>
        <div className="flex items-center gap-2">
          <Button
            type="button"
            variant="outline"
            size="icon"
            className="h-9 w-9 rounded-lg"
            disabled={currentPage <= 1}
            onClick={() => setPage((p) => Math.max(1, p - 1))}
          >
            <Icon name="ChevronLeft" size={16} />
          </Button>
          {Array.from({ length: totalPages }, (_, i) => i + 1).map((p) => (
            <Button
              key={p}
              type="button"
              variant={p === currentPage ? 'default' : 'outline'}
              size="icon"
              className="h-9 w-9 rounded-lg"
              onClick={() => setPage(p)}
            >
              {p}
            </Button>
          ))}
          <Button
            type="button"
            variant="outline"
            size="icon"
            className="h-9 w-9 rounded-lg"
            disabled={currentPage >= totalPages}
            onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
          >
            <Icon name="ChevronRight" size={16} />
          </Button>
        </div>
      </div>

      <div className="flex gap-3 pt-4 border-t">
        <Button type="button" variant="outline" onClick={onBack} className="gap-2">
          {isFirstStep ? (
            <>
              <Icon name="X" size={18} />
              Отмена
            </>
          ) : (
            <>
              <Icon name="ArrowLeft" size={18} />
              Назад
            </>
          )}
        </Button>
        <Button
          type="button"
          className="flex-1 gap-2"
          disabled={!selectedTicketServiceId}
          onClick={onNext}
        >
          Далее
          <Icon name="ArrowRight" size={18} />
        </Button>
      </div>
    </div>
  );
};

export default TicketFormStepService;