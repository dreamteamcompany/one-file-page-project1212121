import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import Icon from '@/components/ui/icon';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { apiFetch, getApiUrl } from '@/utils/api';

interface Watcher {
  id: number;
  user_id: number;
  full_name: string;
  email: string;
  photo_url?: string;
  added_at: string;
}

interface User {
  id: number;
  name: string;
  email: string;
}

interface TicketWatchersBlockProps {
  ticketId: number;
  availableUsers: User[];
}

const TicketWatchersBlock = ({ ticketId, availableUsers }: TicketWatchersBlockProps) => {
  const [watchers, setWatchers] = useState<Watcher[]>([]);
  const [loading, setLoading] = useState(true);
  const [adding, setAdding] = useState(false);
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState('');

  const WATCHERS_URL = getApiUrl('ticket-watchers');

  const fetchWatchers = async () => {
    try {
      const res = await apiFetch(`${WATCHERS_URL}?endpoint=ticket-watchers&ticket_id=${ticketId}`);
      const data = await res.json();
      setWatchers(data.watchers || []);
    } catch (e) {
      console.error('Failed to fetch watchers', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchWatchers();
  }, [ticketId]);

  const addWatcher = async (userId: number) => {
    setAdding(true);
    try {
      const res = await apiFetch(`${WATCHERS_URL}?endpoint=ticket-watchers`, {
        method: 'POST',
        body: JSON.stringify({ ticket_id: ticketId, user_id: userId }),
      });
      const data = await res.json();
      setWatchers(data.watchers || []);
      setOpen(false);
      setSearch('');
    } catch (e) {
      console.error('Failed to add watcher', e);
    } finally {
      setAdding(false);
    }
  };

  const removeWatcher = async (userId: number) => {
    try {
      await apiFetch(`${WATCHERS_URL}?endpoint=ticket-watchers`, {
        method: 'DELETE',
        body: JSON.stringify({ ticket_id: ticketId, user_id: userId }),
      });
      setWatchers(prev => prev.filter(w => w.user_id !== userId));
    } catch (e) {
      console.error('Failed to remove watcher', e);
    }
  };

  const watcherIds = new Set(watchers.map(w => w.user_id));
  const filteredUsers = availableUsers.filter(
    u => !watcherIds.has(u.id) &&
    (u.name.toLowerCase().includes(search.toLowerCase()) ||
     u.email.toLowerCase().includes(search.toLowerCase()))
  );

  const getInitials = (name: string) => {
    return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
  };

  return (
    <div className="rounded-lg bg-card border">
      <div className="p-4">
        <h3 className="text-xs font-semibold mb-3 text-foreground uppercase tracking-wide flex items-center gap-2">
          <Icon name="Eye" size={14} />
          Наблюдатели
        </h3>

        {loading ? (
          <div className="flex items-center gap-2 text-muted-foreground text-sm">
            <Icon name="Loader2" size={14} className="animate-spin" />
            Загрузка...
          </div>
        ) : (
          <div className="space-y-2">
            {watchers.length > 0 && (
              <div className="space-y-1.5">
                {watchers.map(watcher => (
                  <div key={watcher.user_id} className="flex items-center justify-between gap-2 group">
                    <div className="flex items-center gap-2 min-w-0">
                      {watcher.photo_url ? (
                        <img src={watcher.photo_url} alt={watcher.full_name} className="w-6 h-6 rounded-full object-cover flex-shrink-0" />
                      ) : (
                        <div className="w-6 h-6 rounded-full bg-primary/10 text-primary flex items-center justify-center text-[10px] font-semibold flex-shrink-0">
                          {getInitials(watcher.full_name)}
                        </div>
                      )}
                      <span className="text-sm truncate text-foreground">{watcher.full_name}</span>
                    </div>
                    <button
                      onClick={() => removeWatcher(watcher.user_id)}
                      className="opacity-0 group-hover:opacity-100 transition-opacity text-muted-foreground hover:text-destructive"
                      title="Удалить наблюдателя"
                    >
                      <Icon name="X" size={14} />
                    </button>
                  </div>
                ))}
              </div>
            )}

            <Popover open={open} onOpenChange={setOpen}>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  size="sm"
                  className="w-full text-xs h-7"
                  disabled={adding}
                >
                  <Icon name="UserPlus" size={13} className="mr-1.5" />
                  Добавить наблюдателя
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-64 p-2" align="start">
                <input
                  autoFocus
                  placeholder="Поиск..."
                  value={search}
                  onChange={e => setSearch(e.target.value)}
                  className="w-full text-sm px-2 py-1.5 rounded border bg-background mb-2 outline-none"
                />
                <div className="max-h-48 overflow-y-auto space-y-0.5">
                  {filteredUsers.length === 0 ? (
                    <p className="text-xs text-muted-foreground text-center py-2">
                      {search ? 'Ничего не найдено' : 'Все пользователи уже добавлены'}
                    </p>
                  ) : (
                    filteredUsers.map(user => (
                      <button
                        key={user.id}
                        onClick={() => addWatcher(user.id)}
                        disabled={adding}
                        className="w-full flex items-center gap-2 px-2 py-1.5 rounded hover:bg-accent text-sm text-left transition-colors"
                      >
                        <div className="w-6 h-6 rounded-full bg-primary/10 text-primary flex items-center justify-center text-[10px] font-semibold flex-shrink-0">
                          {getInitials(user.name)}
                        </div>
                        <div className="min-w-0">
                          <p className="truncate font-medium">{user.name}</p>
                          <p className="truncate text-xs text-muted-foreground">{user.email}</p>
                        </div>
                      </button>
                    ))
                  )}
                </div>
              </PopoverContent>
            </Popover>
          </div>
        )}
      </div>
    </div>
  );
};

export default TicketWatchersBlock;