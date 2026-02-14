import { useState, useMemo } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import Icon from '@/components/ui/icon';
import type { GroupAssignment, UserAssignment } from '@/hooks/useExecutorAssignments';

interface CombinedAssignment {
  key: string;
  ticket_service_name: string;
  service_name: string;
  ticket_service_id: number;
  service_id: number;
  groups: { id: number; group_name: string }[];
  users: { id: number; user_name: string; user_email: string }[];
}

interface AssignmentsTableProps {
  groupAssignments: GroupAssignment[];
  userAssignments: UserAssignment[];
  loading: boolean;
  onRemoveGroup: (id: number) => Promise<boolean>;
  onRemoveUser: (id: number) => Promise<boolean>;
}

const AssignmentsTable = ({
  groupAssignments,
  userAssignments,
  loading,
  onRemoveGroup,
  onRemoveUser,
}: AssignmentsTableProps) => {
  const [removingId, setRemovingId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');

  const combined = useMemo(() => {
    const map = new Map<string, CombinedAssignment>();

    const getKey = (tsId: number, sId: number) => `${tsId}-${sId}`;

    for (const ga of groupAssignments) {
      const k = getKey(ga.ticket_service_id, ga.service_id);
      if (!map.has(k)) {
        map.set(k, {
          key: k,
          ticket_service_name: ga.ticket_service_name,
          service_name: ga.service_name,
          ticket_service_id: ga.ticket_service_id,
          service_id: ga.service_id,
          groups: [],
          users: [],
        });
      }
      map.get(k)!.groups.push({ id: ga.id, group_name: ga.group_name });
    }

    for (const ua of userAssignments) {
      const k = getKey(ua.ticket_service_id, ua.service_id);
      if (!map.has(k)) {
        map.set(k, {
          key: k,
          ticket_service_name: ua.ticket_service_name,
          service_name: ua.service_name,
          ticket_service_id: ua.ticket_service_id,
          service_id: ua.service_id,
          groups: [],
          users: [],
        });
      }
      map.get(k)!.users.push({
        id: ua.id,
        user_name: ua.user_name,
        user_email: ua.user_email,
      });
    }

    return Array.from(map.values()).sort((a, b) =>
      a.ticket_service_name.localeCompare(b.ticket_service_name) ||
      a.service_name.localeCompare(b.service_name),
    );
  }, [groupAssignments, userAssignments]);

  const filtered = useMemo(() => {
    if (!searchQuery.trim()) return combined;
    const q = searchQuery.toLowerCase();
    return combined.filter(
      c =>
        c.ticket_service_name.toLowerCase().includes(q) ||
        c.service_name.toLowerCase().includes(q) ||
        c.groups.some(g => g.group_name.toLowerCase().includes(q)) ||
        c.users.some(u => u.user_name.toLowerCase().includes(q)),
    );
  }, [combined, searchQuery]);

  const handleRemoveGroup = async (id: number) => {
    setRemovingId(`g-${id}`);
    await onRemoveGroup(id);
    setRemovingId(null);
  };

  const handleRemoveUser = async (id: number) => {
    setRemovingId(`u-${id}`);
    await onRemoveUser(id);
    setRemovingId(null);
  };

  if (loading) {
    return (
      <div className="flex justify-center py-12">
        <Icon name="Loader2" size={32} className="animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div>
      <div className="flex items-center gap-3 mb-4">
        <div className="relative flex-1 max-w-sm">
          <Icon name="Search" size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <input
            type="text"
            placeholder="Поиск по услуге, сервису, группе..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-3 py-2 text-sm rounded-lg border bg-background focus:outline-none focus:ring-2 focus:ring-primary/30"
          />
        </div>
        <span className="text-xs text-muted-foreground whitespace-nowrap">
          {filtered.length} комбинаций
        </span>
      </div>

      {filtered.length === 0 ? (
        <div className="text-center py-12 text-muted-foreground">
          <Icon name="Unlink" size={48} className="mx-auto mb-3 opacity-30" />
          <p className="text-sm">
            {combined.length === 0
              ? 'Пока нет привязок'
              : 'Ничего не найдено'
            }
          </p>
          {combined.length === 0 && (
            <p className="text-xs mt-1">Используйте форму выше, чтобы привязать исполнителей</p>
          )}
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map(combo => (
            <div key={combo.key} className="p-4 rounded-lg border bg-card">
              <div className="flex items-start gap-3 mb-3">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <Badge variant="outline" className="gap-1">
                      <Icon name="Wrench" size={12} />
                      {combo.ticket_service_name}
                    </Badge>
                    <Icon name="ArrowRight" size={14} className="text-muted-foreground" />
                    <Badge variant="outline" className="gap-1">
                      <Icon name="Server" size={12} />
                      {combo.service_name}
                    </Badge>
                  </div>
                </div>
              </div>

              <div className="flex flex-wrap gap-2">
                {combo.groups.map(g => (
                  <div
                    key={`g-${g.id}`}
                    className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-md bg-primary/10 text-sm"
                  >
                    <Icon name="UsersRound" size={14} className="text-primary" />
                    <span>{g.group_name}</span>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-5 w-5 p-0 ml-1 text-destructive hover:text-destructive"
                      disabled={removingId === `g-${g.id}`}
                      onClick={() => handleRemoveGroup(g.id)}
                    >
                      {removingId === `g-${g.id}`
                        ? <Icon name="Loader2" size={12} className="animate-spin" />
                        : <Icon name="X" size={12} />
                      }
                    </Button>
                  </div>
                ))}

                {combo.users.map(u => (
                  <div
                    key={`u-${u.id}`}
                    className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-md bg-blue-500/10 text-sm"
                  >
                    <Icon name="User" size={14} className="text-blue-500" />
                    <span>{u.user_name}</span>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-5 w-5 p-0 ml-1 text-destructive hover:text-destructive"
                      disabled={removingId === `u-${u.id}`}
                      onClick={() => handleRemoveUser(u.id)}
                    >
                      {removingId === `u-${u.id}`
                        ? <Icon name="Loader2" size={12} className="animate-spin" />
                        : <Icon name="X" size={12} />
                      }
                    </Button>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default AssignmentsTable;
