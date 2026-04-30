import { useState, useEffect } from 'react';
import Icon from '@/components/ui/icon';
import { apiFetch } from '@/utils/api';
import { useToast } from '@/hooks/use-toast';
import func2url from '../../../backend/func2url.json';
import type { TicketService, Service } from './ExamplesTab';
import LogsStatsCards from './logs/LogsStatsCards';
import LogsList from './logs/LogsList';
import LogDetailsDialog from './logs/LogDetailsDialog';
import { LogEntry, LogsData } from './logs/types';

const AI_TRAINING_URL = func2url['api-ai-training'];

interface LogsTabProps {
  ticketServices: TicketService[];
  services: Service[];
  onExampleAdded?: () => void;
}

const LogsTab = ({ ticketServices, services, onExampleAdded }: LogsTabProps) => {
  const { toast } = useToast();
  const [data, setData] = useState<LogsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'' | 'true' | 'false'>('');
  const [page, setPage] = useState(0);
  const [selectedLog, setSelectedLog] = useState<LogEntry | null>(null);
  const [showAddExample, setShowAddExample] = useState(false);
  const [exampleForm, setExampleForm] = useState({ ticket_service_id: '', service_ids: [] as number[] });
  const [saving, setSaving] = useState(false);
  const pageSize = 20;

  const loadLogs = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ endpoint: 'logs', limit: String(pageSize), offset: String(page * pageSize) });
      if (filter) params.set('success', filter);
      const res = await apiFetch(`${AI_TRAINING_URL}?${params}`);
      if (res.ok) {
        const result = await res.json();
        setData(result);
      }
    } catch (err) {
      console.error('Failed to load logs:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadLogs();
  }, [filter, page]);

  const selectedTs = ticketServices.find(ts => ts.id.toString() === exampleForm.ticket_service_id);
  const filteredServices = selectedTs?.service_ids
    ? services.filter(s => selectedTs.service_ids?.includes(s.id))
    : services;

  const openAddExample = () => {
    if (selectedLog) {
      setExampleForm({
        ticket_service_id: selectedLog.ticket_service_id?.toString() || '',
        service_ids: selectedLog.service_ids || [],
      });
    }
    setShowAddExample(true);
  };

  const toggleServiceId = (serviceId: number) => {
    setExampleForm(prev => ({
      ...prev,
      service_ids: prev.service_ids.includes(serviceId)
        ? prev.service_ids.filter(id => id !== serviceId)
        : [...prev.service_ids, serviceId],
    }));
  };

  const saveAsExample = async () => {
    if (!selectedLog || !exampleForm.ticket_service_id) {
      toast({ title: 'Выберите услугу', variant: 'destructive' });
      return;
    }

    setSaving(true);
    const body = {
      description: selectedLog.description,
      ticket_service_id: parseInt(exampleForm.ticket_service_id),
      service_ids: exampleForm.service_ids,
    };

    const res = await apiFetch(AI_TRAINING_URL + '?endpoint=examples', {
      method: 'POST',
      body: JSON.stringify(body),
    });

    if (res.ok) {
      toast({ title: 'Пример добавлен из лога' });
      setShowAddExample(false);
      setSelectedLog(null);
      onExampleAdded?.();
    } else {
      toast({ title: 'Ошибка сохранения', variant: 'destructive' });
    }
    setSaving(false);
  };

  if (loading && !data) {
    return (
      <div className="flex items-center justify-center py-12">
        <Icon name="Loader2" size={24} className="animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {data && <LogsStatsCards data={data} />}

      <LogsList
        data={data}
        filter={filter}
        page={page}
        pageSize={pageSize}
        onFilterChange={(f) => { setFilter(f); setPage(0); }}
        onPrevPage={() => setPage(p => p - 1)}
        onNextPage={() => setPage(p => p + 1)}
        onSelectLog={setSelectedLog}
      />

      <LogDetailsDialog
        selectedLog={selectedLog}
        showAddExample={showAddExample}
        setSelectedLog={setSelectedLog}
        setShowAddExample={setShowAddExample}
        exampleForm={exampleForm}
        setExampleForm={setExampleForm}
        ticketServices={ticketServices}
        filteredServices={filteredServices}
        saving={saving}
        openAddExample={openAddExample}
        toggleServiceId={toggleServiceId}
        saveAsExample={saveAsExample}
      />
    </div>
  );
};

export default LogsTab;
