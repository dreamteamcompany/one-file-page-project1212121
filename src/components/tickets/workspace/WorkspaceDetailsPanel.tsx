/**
 * Правая панель деталей заявки в новом интерфейсе.
 * Полностью рабочая: загружает данные выбранной заявки, позволяет менять статус,
 * исполнителя, отправлять комментарии. Переиспользует useTicketData/useTicketActions.
 */
import { useMemo, useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import Icon from '@/components/ui/icon';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { useTicketData } from '@/hooks/useTicketData';
import { useTicketActions } from '@/hooks/useTicketActions';
import { formatDateMSK, getDeadlineSeverity, getDeadlineLeftLabel } from '@/utils/dateFormat';

interface WorkspaceDetailsPanelProps {
  ticketId: number;
  onClose: () => void;
  onChanged?: () => void;
}

const initials = (name?: string): string => {
  if (!name) return '?';
  return name.trim().split(/\s+/).slice(0, 2).map((p) => p[0]).join('').toUpperCase();
};

const WorkspaceDetailsPanel = ({ ticketId, onClose, onChanged }: WorkspaceDetailsPanelProps) => {
  const { hasPermission } = useAuth();
  const id = String(ticketId);

  const {
    ticket,
    statuses,
    comments,
    executorUsers,
    loading,
    loadingComments,
    loadTicket,
    loadComments,
    loadHistory,
  } = useTicketData(id, null);

  const {
    newComment,
    setNewComment,
    submittingComment,
    updating,
    handleSubmitComment,
    handleUpdateStatus,
    handleAssignUser,
  } = useTicketActions(id, async () => { await loadTicket(false); onChanged?.(); }, loadComments, loadHistory);

  const [tab, setTab] = useState('details');

  const canUpdate = hasPermission('tickets', 'update');

  const severity = useMemo(() => getDeadlineSeverity(ticket?.due_date), [ticket?.due_date]);

  if (loading && !ticket) {
    return (
      <div className="flex h-full items-center justify-center rounded-2xl border border-border bg-card">
        <Icon name="Loader2" size={32} className="animate-spin text-primary" />
      </div>
    );
  }

  if (!ticket) {
    return (
      <div className="flex h-full flex-col items-center justify-center rounded-2xl border border-border bg-card text-muted-foreground">
        <Icon name="FileQuestion" size={40} className="mb-2" />
        <span>Заявка не найдена</span>
      </div>
    );
  }

  return (
    <div className="flex h-full flex-col rounded-2xl border border-border bg-card shadow-sm">
      {/* Заголовок */}
      <div className="flex items-start justify-between gap-2 border-b border-border p-4">
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <span className="text-sm font-medium text-muted-foreground">#{ticket.id}</span>
            {ticket.status_name && (
              <span className="rounded-full bg-red-100 px-2 py-0.5 text-xs font-medium text-red-700 dark:bg-red-950/40 dark:text-red-300">
                {ticket.status_name}
              </span>
            )}
          </div>
          <h2 className="mt-1 truncate text-lg font-bold text-foreground">{ticket.title}</h2>
        </div>
        <button
          type="button"
          onClick={onClose}
          className="shrink-0 rounded-lg p-1.5 text-muted-foreground hover:bg-muted"
        >
          <Icon name="X" size={18} />
        </button>
      </div>

      <div className="flex-1 overflow-auto p-4">
        {/* Метрики: создано / обновлено / SLA */}
        <div className="grid grid-cols-3 gap-2 text-xs">
          <div>
            <div className="text-muted-foreground">Создано</div>
            <div className="mt-0.5 font-medium text-foreground">{formatDateMSK(ticket.created_at)}</div>
          </div>
          <div>
            <div className="text-muted-foreground">Обновлено</div>
            <div className="mt-0.5 font-medium text-foreground">{formatDateMSK(ticket.updated_at)}</div>
          </div>
          <div>
            <div className="text-muted-foreground">SLA</div>
            <div className="mt-0.5 font-medium text-foreground">
              {ticket.due_date ? getDeadlineLeftLabel(ticket.due_date) : '—'}
            </div>
          </div>
        </div>
        {severity && (
          <div className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-muted">
            <div
              className="h-full rounded-full"
              style={{ width: `${severity.percent}%`, backgroundColor: severity.color }}
            />
          </div>
        )}

        <Tabs value={tab} onValueChange={setTab} className="mt-4">
          <TabsList className="w-full justify-start">
            <TabsTrigger value="details">Детали</TabsTrigger>
            <TabsTrigger value="comments">Комментарии {comments.length > 0 ? comments.length : ''}</TabsTrigger>
          </TabsList>

          <TabsContent value="details" className="mt-4 space-y-5">
            {/* Заявитель */}
            <div>
              <div className="mb-2 text-xs font-medium text-muted-foreground">Заявитель</div>
              <div className="flex items-center gap-3">
                <Avatar className="h-9 w-9">
                  <AvatarImage src={ticket.creator_photo_url} />
                  <AvatarFallback>{initials(ticket.creator_name)}</AvatarFallback>
                </Avatar>
                <div className="min-w-0">
                  <div className="truncate text-sm font-medium text-foreground">{ticket.creator_name || '—'}</div>
                  {ticket.creator_email && (
                    <div className="truncate text-xs text-muted-foreground">{ticket.creator_email}</div>
                  )}
                </div>
              </div>
            </div>

            {/* Исполнитель */}
            <div>
              <div className="mb-2 text-xs font-medium text-muted-foreground">Исполнитель</div>
              <Select
                value={ticket.assigned_to ? String(ticket.assigned_to) : 'unassign'}
                onValueChange={(v) => canUpdate && handleAssignUser(v)}
                disabled={!canUpdate || updating}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Не назначен" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="unassign">Не назначен</SelectItem>
                  {executorUsers.map((u) => (
                    <SelectItem key={u.id} value={String(u.id)}>{u.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Статус */}
            <div>
              <div className="mb-2 text-xs font-medium text-muted-foreground">Статус</div>
              <Select
                value={ticket.status_id ? String(ticket.status_id) : undefined}
                onValueChange={(v) => canUpdate && handleUpdateStatus(Number(v))}
                disabled={!canUpdate || updating}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Выберите статус" />
                </SelectTrigger>
                <SelectContent>
                  {statuses.map((s) => (
                    <SelectItem key={s.id} value={String(s.id)}>{s.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Приоритет / Категория (только чтение) */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <div className="mb-1 text-xs font-medium text-muted-foreground">Приоритет</div>
                <div className="rounded-lg border border-border px-3 py-2 text-sm text-foreground">
                  {ticket.priority_name || '—'}
                </div>
              </div>
              <div>
                <div className="mb-1 text-xs font-medium text-muted-foreground">Категория</div>
                <div className="rounded-lg border border-border px-3 py-2 text-sm text-foreground truncate">
                  {ticket.category_name || '—'}
                </div>
              </div>
            </div>

            {ticket.description && (
              <div>
                <div className="mb-1 text-xs font-medium text-muted-foreground">Описание</div>
                <div className="whitespace-pre-wrap rounded-lg border border-border p-3 text-sm text-foreground">
                  {ticket.description}
                </div>
              </div>
            )}
          </TabsContent>

          <TabsContent value="comments" className="mt-4">
            {loadingComments ? (
              <div className="flex items-center justify-center py-8">
                <Icon name="Loader2" size={24} className="animate-spin text-primary" />
              </div>
            ) : comments.length === 0 ? (
              <div className="py-8 text-center text-sm text-muted-foreground">Пока нет комментариев</div>
            ) : (
              <div className="space-y-4">
                {comments.map((c) => (
                  <div key={c.id} className="flex gap-3">
                    <Avatar className="h-8 w-8 shrink-0">
                      <AvatarImage src={c.user_photo_url} />
                      <AvatarFallback className="text-[10px]">
                        {initials(c.user_full_name || c.user_name)}
                      </AvatarFallback>
                    </Avatar>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-medium text-foreground">
                          {c.user_full_name || c.user_name || 'Пользователь'}
                        </span>
                        <span className="text-xs text-muted-foreground">{formatDateMSK(c.created_at)}</span>
                      </div>
                      <div className="mt-0.5 whitespace-pre-wrap text-sm text-foreground">{c.comment}</div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </TabsContent>
        </Tabs>
      </div>

      {/* Быстрое добавление комментария */}
      <div className="border-t border-border p-4">
        <div className="mb-2 text-xs font-medium text-muted-foreground">Быстрые действия</div>
        <div className="flex items-end gap-2">
          <Textarea
            value={newComment}
            onChange={(e) => setNewComment(e.target.value)}
            placeholder="Напишите комментарий..."
            rows={2}
            className="resize-none"
          />
          <Button
            size="icon"
            disabled={submittingComment || !newComment.trim()}
            onClick={() => handleSubmitComment()}
          >
            {submittingComment ? (
              <Icon name="Loader2" size={18} className="animate-spin" />
            ) : (
              <Icon name="Send" size={18} />
            )}
          </Button>
        </div>
      </div>
    </div>
  );
};

export default WorkspaceDetailsPanel;