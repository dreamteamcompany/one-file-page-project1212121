import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import Icon from '@/components/ui/icon';
import { Badge } from '@/components/ui/badge';
import { apiFetch, getApiUrl } from '@/utils/api';

interface RecentTicket {
  id: number;
  title: string;
  status_name?: string;
  status_color?: string;
  created_at?: string;
  services?: Array<{ id: number; name: string; category_name?: string }>;
  ticket_service?: { id: number; name: string };
}

interface RecentTicketsBlockProps {
  ticketId: number;
  createdBy: number;
}

const RecentTicketsBlock = ({ ticketId, createdBy }: RecentTicketsBlockProps) => {
  const navigate = useNavigate();
  const [tickets, setTickets] = useState<RecentTicket[]>([]);
  const [loading, setLoading] = useState(true);
  const [isOpen, setIsOpen] = useState(true);

  useEffect(() => {
    let cancelled = false;

    const fetchOnce = async (): Promise<RecentTicket[] | null> => {
      const baseUrl = getApiUrl('tickets');
      const url = `${baseUrl}?endpoint=tickets&created_by=${createdBy}&limit=10&page=1&show_all=true`;
      const response = await apiFetch(url);
      if (!response.ok) {
        return null;
      }
      const data = await response.json();
      return (data.tickets || []) as RecentTicket[];
    };

    const loadRecentTickets = async () => {
      setLoading(true);
      const maxAttempts = 3;
      for (let attempt = 1; attempt <= maxAttempts; attempt++) {
        try {
          const result = await fetchOnce();
          if (cancelled) return;
          if (result !== null) {
            const filtered = result
              .filter((t) => t.id !== ticketId)
              .slice(0, 3);
            setTickets(filtered);
            setLoading(false);
            return;
          }
        } catch (error) {
          if (cancelled) return;
          console.error('Error loading recent tickets (attempt ' + attempt + '):', error);
        }
        if (attempt < maxAttempts) {
          await new Promise((resolve) => setTimeout(resolve, 500 * attempt));
        }
      }
      if (!cancelled) {
        setLoading(false);
      }
    };

    if (createdBy) {
      loadRecentTickets();
    }

    return () => {
      cancelled = true;
    };
  }, [ticketId, createdBy]);

  const formatDate = (dateStr?: string) => {
    if (!dateStr) return '—';
    const date = new Date(dateStr);
    return date.toLocaleDateString('ru-RU', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
    });
  };

  const getServiceName = (ticket: RecentTicket) => {
    if (ticket.ticket_service?.name) return ticket.ticket_service.name;
    if (ticket.services?.length) return ticket.services[0].name;
    return null;
  };

  const getCategoryName = (ticket: RecentTicket) => {
    if (ticket.services?.length && ticket.services[0].category_name) {
      return ticket.services[0].category_name;
    }
    return null;
  };

  const Header = ({ count }: { count?: number }) => (
    <button
      onClick={() => setIsOpen((v) => !v)}
      className="w-full flex items-center justify-between gap-2 text-left"
    >
      <h3 className="text-xs font-semibold text-foreground uppercase tracking-wide flex items-center gap-2">
        <Icon name="History" size={14} className="text-foreground" />
        Последние заявки заказчика
        {count !== undefined && count > 0 && (
          <span className="text-[10px] font-normal normal-case tracking-normal bg-muted px-1.5 py-0.5 rounded-full">
            {count}
          </span>
        )}
      </h3>
      <Icon
        name="ChevronDown"
        size={14}
        className={`text-muted-foreground shrink-0 transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`}
      />
    </button>
  );

  if (loading) {
    return (
      <div className="rounded-lg bg-card border p-4">
        <Header />
        {isOpen && (
          <div className="flex items-center justify-center py-4 mt-3">
            <Icon name="Loader2" size={18} className="animate-spin text-muted-foreground" />
          </div>
        )}
      </div>
    );
  }

  if (tickets.length === 0) {
    return (
      <div className="rounded-lg bg-card border p-4">
        <Header />
        {isOpen && (
          <p className="text-xs text-muted-foreground mt-3">Нет других заявок</p>
        )}
      </div>
    );
  }

  return (
    <div className="rounded-lg bg-card border p-4">
      <Header count={tickets.length} />
      {isOpen && (
        <div className="space-y-2 mt-3">
          {tickets.map((t) => {
            const serviceName = getServiceName(t);
            const categoryName = getCategoryName(t);

            return (
              <div
                key={t.id}
                onClick={() => navigate(`/tickets/${t.id}`)}
                className="rounded-md border border-border/60 p-3 cursor-pointer hover:bg-accent/50 transition-colors"
              >
                <div className="flex items-center justify-between gap-2 mb-1.5">
                  <span className="text-xs font-medium text-primary">#{t.id}</span>
                  <span className="text-[10px] text-muted-foreground">{formatDate(t.created_at)}</span>
                </div>

                <p className="text-xs font-medium text-foreground leading-snug mb-1.5 line-clamp-2">
                  {t.title}
                </p>

                <div className="flex flex-wrap items-center gap-1.5">
                  {t.status_name && (
                    <Badge
                      variant="outline"
                      className="text-[10px] px-1.5 py-0 h-4 font-normal"
                      style={{
                        borderColor: t.status_color || undefined,
                        color: t.status_color || undefined,
                      }}
                    >
                      {t.status_name}
                    </Badge>
                  )}
                  {categoryName && (
                    <Badge variant="secondary" className="text-[10px] px-1.5 py-0 h-4 font-normal">
                      {categoryName}
                    </Badge>
                  )}
                  {serviceName && (
                    <Badge variant="secondary" className="text-[10px] px-1.5 py-0 h-4 font-normal">
                      {serviceName}
                    </Badge>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default RecentTicketsBlock;