import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import Icon from '@/components/ui/icon';
import { apiFetch } from '@/utils/api';
import { useToast } from '@/hooks/use-toast';
import func2url from '../../../backend/func2url.json';
import type { TicketService, Service } from './ExamplesTab';

const AI_TRAINING_URL = func2url['api-ai-training'];

export interface PendingReview {
  id: number;
  description: string;
  ticket_service_id: number;
  service_ids: number[];
  ticket_service_name: string;
  service_names: string[];
  confidence: number;
  status: string;
  created_at: string;
}

interface PendingReviewsTabProps {
  pendingReviews: PendingReview[];
  ticketServices: TicketService[];
  services: Service[];
  onReload: () => void;
}

const PendingReviewsTab = ({ pendingReviews, ticketServices, services, onReload }: PendingReviewsTabProps) => {
  const { toast } = useToast();

  const [correctDialog, setCorrectDialog] = useState(false);
  const [correctingReview, setCorrectingReview] = useState<PendingReview | null>(null);
  const [correctForm, setCorrectForm] = useState({ ticket_service_id: '', service_ids: [] as number[] });
  const [loading, setLoading] = useState(false);

  const selectedTs = ticketServices.find(ts => ts.id.toString() === correctForm.ticket_service_id);
  const filteredServices = selectedTs?.service_ids
    ? services.filter(s => selectedTs.service_ids?.includes(s.id))
    : services;

  const getConfidenceBadge = (confidence: number) => {
    if (confidence > 70) {
      return (
        <Badge variant="outline" className="text-xs text-green-600 border-green-300 bg-green-50">
          {confidence}%
        </Badge>
      );
    }
    if (confidence >= 40) {
      return (
        <Badge variant="outline" className="text-xs text-yellow-600 border-yellow-300 bg-yellow-50">
          {confidence}%
        </Badge>
      );
    }
    return (
      <Badge variant="outline" className="text-xs text-red-600 border-red-300 bg-red-50">
        {confidence}%
      </Badge>
    );
  };

  const handleApprove = async (id: number) => {
    setLoading(true);
    const res = await apiFetch(AI_TRAINING_URL + '?endpoint=pending_reviews', {
      method: 'POST',
      body: JSON.stringify({ action: 'approve', id }),
    });
    setLoading(false);
    if (res.ok) {
      toast({ title: 'Классификация подтверждена' });
      onReload();
    } else {
      toast({ title: 'Ошибка подтверждения', variant: 'destructive' });
    }
  };

  const handleReject = async (id: number) => {
    setLoading(true);
    const res = await apiFetch(AI_TRAINING_URL + '?endpoint=pending_reviews', {
      method: 'POST',
      body: JSON.stringify({ action: 'reject', id }),
    });
    setLoading(false);
    if (res.ok) {
      toast({ title: 'Классификация отклонена' });
      onReload();
    } else {
      toast({ title: 'Ошибка отклонения', variant: 'destructive' });
    }
  };

  const openCorrectDialog = (review: PendingReview) => {
    setCorrectingReview(review);
    setCorrectForm({
      ticket_service_id: review.ticket_service_id?.toString() || '',
      service_ids: review.service_ids || [],
    });
    setCorrectDialog(true);
  };

  const handleCorrect = async () => {
    if (!correctingReview || !correctForm.ticket_service_id) {
      toast({ title: 'Выберите услугу', variant: 'destructive' });
      return;
    }

    setLoading(true);
    const res = await apiFetch(AI_TRAINING_URL + '?endpoint=pending_reviews', {
      method: 'POST',
      body: JSON.stringify({
        action: 'correct',
        id: correctingReview.id,
        ticket_service_id: parseInt(correctForm.ticket_service_id),
        service_ids: correctForm.service_ids,
      }),
    });
    setLoading(false);
    if (res.ok) {
      toast({ title: 'Классификация исправлена и подтверждена' });
      setCorrectDialog(false);
      onReload();
    } else {
      toast({ title: 'Ошибка сохранения', variant: 'destructive' });
    }
  };

  const handleApproveAll = async () => {
    setLoading(true);
    const res = await apiFetch(AI_TRAINING_URL + '?endpoint=pending_reviews', {
      method: 'POST',
      body: JSON.stringify({ action: 'approve_all' }),
    });
    setLoading(false);
    if (res.ok) {
      const data = await res.json();
      toast({ title: `Подтверждено: ${data.count}` });
      onReload();
    } else {
      toast({ title: 'Ошибка массового подтверждения', variant: 'destructive' });
    }
  };

  const toggleServiceId = (serviceId: number) => {
    setCorrectForm(prev => ({
      ...prev,
      service_ids: prev.service_ids.includes(serviceId)
        ? prev.service_ids.filter(id => id !== serviceId)
        : [...prev.service_ids, serviceId],
    }));
  };

  return (
    <>
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-base">На проверку</CardTitle>
              <CardDescription className="text-xs mt-1">
                Результаты автоматической классификации, ожидающие проверки оператором.
              </CardDescription>
            </div>
            {pendingReviews.length > 0 && (
              <Button size="sm" className="gap-2" onClick={handleApproveAll} disabled={loading}>
                <Icon name="CheckCheck" size={16} />
                Подтвердить все
              </Button>
            )}
          </div>
        </CardHeader>
        <CardContent>
          {pendingReviews.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <Icon name="CheckCircle" size={40} className="mx-auto mb-3 opacity-30" />
              <p className="text-sm">Нет записей на проверку</p>
              <p className="text-xs mt-1">Новые классификации появятся здесь автоматически</p>
            </div>
          ) : (
            <div className="space-y-3">
              {pendingReviews.map(rv => (
                <div key={rv.id} className="p-3 rounded-lg border bg-muted/20 hover:bg-muted/40 transition-colors">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium mb-1.5 line-clamp-2">{rv.description}</p>
                      <div className="flex flex-wrap gap-1.5">
                        {getConfidenceBadge(rv.confidence)}
                        {rv.ticket_service_name && (
                          <Badge variant="secondary" className="text-xs">
                            {rv.ticket_service_name}
                          </Badge>
                        )}
                        {rv.service_names?.map((name, i) => (
                          <Badge key={i} variant="outline" className="text-xs">
                            {name}
                          </Badge>
                        ))}
                      </div>
                    </div>
                    <div className="flex items-center gap-1 flex-shrink-0">
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7 text-green-600 hover:text-green-700 hover:bg-green-50"
                        onClick={() => handleApprove(rv.id)}
                        disabled={loading}
                        title="Подтвердить"
                      >
                        <Icon name="Check" size={14} />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7 text-blue-600 hover:text-blue-700 hover:bg-blue-50"
                        onClick={() => openCorrectDialog(rv)}
                        disabled={loading}
                        title="Исправить"
                      >
                        <Icon name="Pencil" size={14} />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7 text-destructive"
                        onClick={() => handleReject(rv.id)}
                        disabled={loading}
                        title="Отклонить"
                      >
                        <Icon name="X" size={14} />
                      </Button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <Dialog open={correctDialog} onOpenChange={setCorrectDialog}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Исправить классификацию</DialogTitle>
            <DialogDescription>
              Укажите правильную услугу и сервисы для этой заявки
            </DialogDescription>
          </DialogHeader>
          {correctingReview && (
            <div className="space-y-4">
              <div>
                <Label>Описание заявки</Label>
                <p className="text-sm text-muted-foreground mt-1 p-2 bg-muted/30 rounded">
                  {correctingReview.description}
                </p>
              </div>
              <div>
                <Label>Услуга *</Label>
                <Select
                  value={correctForm.ticket_service_id}
                  onValueChange={v => setCorrectForm(prev => ({ ...prev, ticket_service_id: v, service_ids: [] }))}
                >
                  <SelectTrigger className="mt-1.5">
                    <SelectValue placeholder="Выберите услугу" />
                  </SelectTrigger>
                  <SelectContent>
                    {ticketServices.map(ts => (
                      <SelectItem key={ts.id} value={ts.id.toString()}>
                        {ts.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              {filteredServices.length > 0 && (
                <div>
                  <Label>Сервисы</Label>
                  <div className="flex flex-wrap gap-2 mt-1.5">
                    {filteredServices.map(svc => (
                      <Badge
                        key={svc.id}
                        variant={correctForm.service_ids.includes(svc.id) ? 'default' : 'outline'}
                        className="cursor-pointer transition-colors"
                        onClick={() => toggleServiceId(svc.id)}
                      >
                        {svc.name}
                        {correctForm.service_ids.includes(svc.id) && (
                          <Icon name="Check" size={12} className="ml-1" />
                        )}
                      </Badge>
                    ))}
                  </div>
                </div>
              )}
              <div className="flex justify-end gap-2 pt-2">
                <Button variant="outline" onClick={() => setCorrectDialog(false)}>Отмена</Button>
                <Button onClick={handleCorrect} disabled={loading}>
                  Сохранить и подтвердить
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
};

export default PendingReviewsTab;
