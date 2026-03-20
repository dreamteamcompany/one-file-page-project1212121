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

  useEffect(() => {
    const loadRecentTickets = async () => {
      try {
        setLoading(true);
        const baseUrl = getApiUrl('tickets');
        const response = await apiFetch(
          `${baseUrl}?endpoint=tickets&created_by=${createdBy}&limit=4&page=1`
        );
        if (response.ok) {
          const data = await response.json();
          const allTickets: RecentTicket[] = data.tickets || [];
          const filtered = allTickets
            .filter((t) => t.id !== ticketId)
            .slice(0, 3);
          setTickets(filtered);
        }
      } catch (error) {
        console.error('Error loading recent tickets:', error);
      } finally {
        setLoading(false);
      }
    };

    if (createdBy) {
      loadRecentTickets();
    }
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

  if (loading) {
    return (
      <div className="rounded-lg bg-card border p-4">
        <h3 className="text-xs font-semibold mb-3 text-muted-foreground uppercase tracking-wide flex items-center gap-2">
          <Icon name="History" size={14} />
          Последние заявки заказчика
        </h3>
        <div className="flex items-center justify-center py-4">
          <Icon name="Loader2" size={18} className="animate-spin text-muted-foreground" />
        </div>
      </div>
    );
  }

  if (tickets.length === 0) {
    return (
      <div className="rounded-lg bg-card border p-4">
        <h3 className="text-xs font-semibold mb-3 text-muted-foreground uppercase tracking-wide flex items-center gap-2">
          <Icon name="History" size={14} />
          Последние заявки заказчика
        </h3>
        <p className="text-xs text-muted-foreground">Нет других заявок</p>
      </div>
    );
  }

  return (
    <div className="rounded-lg bg-card border p-4">
      <h3 className="text-xs font-semibold mb-3 text-muted-foreground uppercase tracking-wide flex items-center gap-2">
        <Icon name="History" size={14} />
        Последние заявки заказчика
      </h3>
      <div className="space-y-2">
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
    </div>
  );
};

export default RecentTicketsBlock;
