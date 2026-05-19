import { useEffect, useMemo, useRef, useState, useCallback } from 'react';
import PageLayout from '@/components/layout/PageLayout';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import Icon from '@/components/ui/icon';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import func2url from '../../backend/func2url.json';
import {
  DndContext,
  DragEndEvent,
  DragOverlay,
  DragStartEvent,
  PointerSensor,
  useSensor,
  useSensors,
} from '@dnd-kit/core';
import OrgChartTree from '@/components/org-chart/OrgChartTree';
import DepartmentPanel from '@/components/org-chart/DepartmentPanel';
import EditDepartmentDialog from '@/components/org-chart/EditDepartmentDialog';
import EditCompanyDialog from '@/components/org-chart/EditCompanyDialog';
import {
  Company,
  CompanyNode,
  Department,
  DepartmentNode,
  DepartmentUser,
  OrgChartTreeData,
} from '@/components/org-chart/types';

const API_URL = (func2url as Record<string, string>)['departments'];

const getStoredAuthToken = (): string => {
  const rememberMe = localStorage.getItem('remember_me') === 'true';
  const t = rememberMe
    ? localStorage.getItem('auth_token')
    : sessionStorage.getItem('auth_token');
  return (
    t ||
    localStorage.getItem('auth_token') ||
    sessionStorage.getItem('auth_token') ||
    ''
  );
};

const OrgChart = () => {
  const { user, token, loading: authLoading, hasPermission } = useAuth();
  const { toast } = useToast();
  const isAdmin =
    !!user?.roles?.some(
      (r) => r.name === 'Администратор' || r.name === 'Admin' || r.system_role === 'admin',
    ) || hasPermission('departments', 'write');

  const getToken = useCallback(() => token || getStoredAuthToken(), [token]);
  const authHeaders = useCallback(
    (json = false) => {
      const h: Record<string, string> = { 'X-Auth-Token': getToken() };
      if (json) h['Content-Type'] = 'application/json';
      return h;
    },
    [getToken],
  );

  const [companies, setCompanies] = useState<Company[]>([]);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedDept, setSelectedDept] = useState<number | null>(null);
  const [panelData, setPanelData] = useState<{
    department: Department;
    head: DepartmentUser | null;
    members: DepartmentUser[];
  } | null>(null);
  const [search, setSearch] = useState('');
  const [searchResults, setSearchResults] = useState<DepartmentUser[]>([]);
  const [activeDragUser, setActiveDragUser] = useState<DepartmentUser | null>(null);
  const [editDept, setEditDept] = useState<Department | null>(null);
  const [creatingUnder, setCreatingUnder] = useState<
    { parentId: number | null; companyId: number | null } | null
  >(null);
  const [editCompany, setEditCompany] = useState<{ id: number; name: string } | null>(
    null,
  );
  const [creatingCompany, setCreatingCompany] = useState(false);
  const [expandedNodes, setExpandedNodes] = useState<Set<number>>(new Set());
  const [expandedCompanies, setExpandedCompanies] = useState<Set<string>>(new Set());
  const scrollContainerRef = useRef<HTMLDivElement>(null);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
  );

  const loadTree = useCallback(async () => {
    if (authLoading || !getToken()) return;
    setLoading(true);
    try {
      const res = await fetch(`${API_URL}?endpoint=orgchart-tree`, {
        headers: authHeaders(),
      });
      if (res.ok) {
        const data: OrgChartTreeData = await res.json();
        setCompanies(data.companies || []);
        setDepartments(data.departments || []);
        const all = new Set<string>();
        (data.companies || []).forEach((c) => all.add(`c-${c.id}`));
        all.add('none');
        setExpandedCompanies(all);
      } else {
        toast({ title: 'Не удалось загрузить структуру', variant: 'destructive' });
      }
    } catch {
      toast({ title: 'Ошибка соединения', variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  }, [authLoading, authHeaders, getToken, toast]);

  useEffect(() => {
    loadTree();
  }, [loadTree]);

  const loadDeptUsers = useCallback(
    async (id: number) => {
      try {
        const res = await fetch(`${API_URL}?endpoint=department-users&id=${id}`, {
          headers: authHeaders(),
        });
        if (res.ok) {
          const data = await res.json();
          setPanelData(data);
        }
      } catch {
        /* ignore */
      }
    },
    [authHeaders],
  );

  useEffect(() => {
    if (selectedDept) loadDeptUsers(selectedDept);
    else setPanelData(null);
  }, [selectedDept, loadDeptUsers]);

  useEffect(() => {
    if (!search.trim()) {
      setSearchResults([]);
      return;
    }
    const t = setTimeout(async () => {
      const res = await fetch(
        `${API_URL}?endpoint=search-users&q=${encodeURIComponent(search)}`,
        { headers: authHeaders() },
      );
      if (res.ok) setSearchResults(await res.json());
    }, 250);
    return () => clearTimeout(t);
  }, [search, authHeaders]);

  const expandAncestors = useCallback(
    (deptId: number) => {
      const map = new Map<number, Department>();
      departments.forEach((d) => map.set(d.id, d));
      const target = map.get(deptId);
      const ancestors = new Set<number>();
      let cur = target;
      while (cur && cur.parent_id) {
        ancestors.add(cur.parent_id);
        cur = map.get(cur.parent_id);
      }
      setExpandedNodes((prev) => {
        const next = new Set(prev);
        ancestors.forEach((id) => next.add(id));
        return next;
      });
      if (target) {
        setExpandedCompanies((prev) => {
          const next = new Set(prev);
          next.add(target.company_id === null ? 'none' : `c-${target.company_id}`);
          return next;
        });
      }
    },
    [departments],
  );

  const findMe = async () => {
    const res = await fetch(`${API_URL}?endpoint=me-department`, {
      headers: authHeaders(),
    });
    if (!res.ok) return;
    const data = await res.json();
    if (data.department_id) {
      setSelectedDept(data.department_id);
      expandAncestors(data.department_id);
      setTimeout(() => {
        const el = document.querySelector(`[data-dept-id="${data.department_id}"]`);
        el?.scrollIntoView({ behavior: 'smooth', block: 'center', inline: 'center' });
      }, 200);
    } else {
      toast({ title: 'Вы не привязаны к отделу' });
    }
  };

  const companyNodes = useMemo<CompanyNode[]>(() => {
    const deptMap = new Map<number, DepartmentNode>();
    departments.forEach((d) => deptMap.set(d.id, { ...d, children: [] }));
    deptMap.forEach((node) => {
      if (node.parent_id && deptMap.has(node.parent_id)) {
        deptMap.get(node.parent_id)!.children.push(node);
      }
    });

    const rootsByCompany = new Map<number | 'none', DepartmentNode[]>();
    deptMap.forEach((node) => {
      if (!node.parent_id) {
        const key: number | 'none' = node.company_id == null ? 'none' : node.company_id;
        if (!rootsByCompany.has(key)) rootsByCompany.set(key, []);
        rootsByCompany.get(key)!.push(node);
      }
    });

    const result: CompanyNode[] = companies.map((c) => ({
      kind: 'company',
      id: c.id,
      name: c.name,
      members_count: c.members_count,
      children: rootsByCompany.get(c.id) || [],
    }));

    const orphanRoots = rootsByCompany.get('none') || [];
    if (orphanRoots.length > 0) {
      result.push({
        kind: 'company',
        id: null,
        name: 'Без компании',
        members_count: 0,
        children: orphanRoots,
      });
    }

    return result;
  }, [companies, departments]);

  const handleDragStart = (e: DragStartEvent) => {
    const u = e.active.data.current?.user as DepartmentUser | undefined;
    if (u) setActiveDragUser(u);
  };

  const handleDragEnd = async (e: DragEndEvent) => {
    setActiveDragUser(null);
    if (!isAdmin) {
      if (e.active.data.current?.user) {
        toast({ title: 'Недостаточно прав', variant: 'destructive' });
      }
      return;
    }
    const u = e.active.data.current?.user as DepartmentUser | undefined;
    if (!u) return;
    const overData = e.over?.data.current as
      | { deptId?: number; companyId?: number | null; kind?: string }
      | undefined;
    if (!overData) return;
    if (overData.kind !== 'dept' || !overData.deptId) return;
    if (u.department_id === overData.deptId) return;

    try {
      const res = await fetch(`${API_URL}?endpoint=move-user`, {
        method: 'POST',
        headers: authHeaders(true),
        body: JSON.stringify({ user_id: u.id, department_id: overData.deptId }),
      });
      if (res.ok) {
        toast({ title: `${u.full_name} перемещён` });
        await loadTree();
        if (selectedDept) await loadDeptUsers(selectedDept);
      } else {
        const err = await res.json().catch(() => ({}));
        toast({ title: err.error || 'Не удалось переместить', variant: 'destructive' });
      }
    } catch {
      toast({ title: 'Ошибка соединения', variant: 'destructive' });
    }
  };

  const handleCreateDept = async (
    name: string,
    parentId: number | null,
    headUserId: number | null,
  ) => {
    const companyId = creatingUnder?.companyId ?? null;
    const res = await fetch(`${API_URL}?endpoint=create-dept`, {
      method: 'POST',
      headers: authHeaders(true),
      body: JSON.stringify({
        name,
        parent_id: parentId,
        head_user_id: headUserId,
        company_id: companyId,
      }),
    });
    if (res.ok) {
      toast({ title: 'Отдел создан' });
      await loadTree();
    } else {
      const err = await res.json().catch(() => ({}));
      toast({ title: err.error || 'Ошибка', variant: 'destructive' });
    }
  };

  const handleUpdateDept = async (
    id: number,
    name: string,
    headUserId: number | null,
  ) => {
    const res = await fetch(`${API_URL}?endpoint=update-dept&id=${id}`, {
      method: 'PUT',
      headers: authHeaders(true),
      body: JSON.stringify({ name, head_user_id: headUserId }),
    });
    if (res.ok) {
      toast({ title: 'Отдел обновлён' });
      await loadTree();
      if (selectedDept === id) await loadDeptUsers(id);
    } else {
      const err = await res.json().catch(() => ({}));
      toast({ title: err.error || 'Ошибка', variant: 'destructive' });
    }
  };

  const handleDeleteDept = async (id: number) => {
    if (!window.confirm('Удалить отдел? Действие нельзя отменить.')) return;
    const res = await fetch(`${API_URL}?endpoint=delete-dept&id=${id}`, {
      method: 'DELETE',
      headers: authHeaders(),
    });
    if (res.ok) {
      toast({ title: 'Отдел удалён' });
      if (selectedDept === id) setSelectedDept(null);
      await loadTree();
    } else {
      const err = await res.json().catch(() => ({}));
      toast({ title: err.error || 'Ошибка', variant: 'destructive' });
    }
  };

  const handleCreateCompany = async (name: string) => {
    const res = await fetch(`${API_URL}?endpoint=create-company`, {
      method: 'POST',
      headers: authHeaders(true),
      body: JSON.stringify({ name }),
    });
    if (res.ok) {
      toast({ title: 'Компания создана' });
      await loadTree();
    } else {
      const err = await res.json().catch(() => ({}));
      toast({ title: err.error || 'Ошибка', variant: 'destructive' });
    }
  };

  const handleUpdateCompany = async (id: number, name: string) => {
    const res = await fetch(`${API_URL}?endpoint=update-company&id=${id}`, {
      method: 'PUT',
      headers: authHeaders(true),
      body: JSON.stringify({ name }),
    });
    if (res.ok) {
      toast({ title: 'Компания обновлена' });
      await loadTree();
    } else {
      const err = await res.json().catch(() => ({}));
      toast({ title: err.error || 'Ошибка', variant: 'destructive' });
    }
  };

  const handleDeleteCompany = async (id: number) => {
    if (!window.confirm('Удалить компанию? Действие нельзя отменить.')) return;
    const res = await fetch(`${API_URL}?endpoint=delete-company&id=${id}`, {
      method: 'DELETE',
      headers: authHeaders(),
    });
    if (res.ok) {
      toast({ title: 'Компания удалена' });
      await loadTree();
    } else {
      const err = await res.json().catch(() => ({}));
      toast({ title: err.error || 'Ошибка', variant: 'destructive' });
    }
  };

  return (
    <PageLayout>
      <DndContext sensors={sensors} onDragStart={handleDragStart} onDragEnd={handleDragEnd}>
        <div className="flex flex-col h-[calc(100vh-7rem)] gap-4">
          <div className="flex flex-wrap items-center gap-3 justify-between">
            <div className="flex items-center gap-3">
              <h1 className="text-2xl font-bold flex items-center gap-2">
                <Icon name="GitBranch" size={22} />
                Оргструктура
              </h1>
              <span className="text-sm text-muted-foreground">
                Компаний: {companies.length} · Отделов: {departments.length}
              </span>
            </div>
            <div className="flex items-center gap-2">
              <div className="relative">
                <Icon
                  name="Search"
                  size={16}
                  className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground"
                />
                <Input
                  placeholder="Найти сотрудника или должность"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="pl-9 w-72"
                />
                {searchResults.length > 0 && (
                  <div className="absolute top-full mt-1 w-80 max-h-80 overflow-y-auto bg-popover border rounded-md shadow-lg z-50">
                    {searchResults.map((u) => (
                      <button
                        key={u.id}
                        className="w-full text-left px-3 py-2 hover:bg-accent border-b last:border-b-0"
                        onClick={() => {
                          if (u.department_id) {
                            setSelectedDept(u.department_id);
                            expandAncestors(u.department_id);
                            setTimeout(() => {
                              const el = document.querySelector(
                                `[data-dept-id="${u.department_id}"]`,
                              );
                              el?.scrollIntoView({
                                behavior: 'smooth',
                                block: 'center',
                                inline: 'center',
                              });
                            }, 200);
                          }
                          setSearch('');
                          setSearchResults([]);
                        }}
                      >
                        <div className="text-sm font-medium">{u.full_name}</div>
                        <div className="text-xs text-muted-foreground">
                          {u.position || '—'}
                          {u.department_name ? ` · ${u.department_name}` : ''}
                        </div>
                      </button>
                    ))}
                  </div>
                )}
              </div>
              <Button variant="outline" size="sm" onClick={findMe} className="gap-2">
                <Icon name="MapPin" size={14} />
                Найти меня
              </Button>
              {isAdmin && (
                <Button
                  size="sm"
                  onClick={() => setCreatingCompany(true)}
                  className="gap-2"
                >
                  <Icon name="Plus" size={14} />
                  Добавить компанию
                </Button>
              )}
            </div>
          </div>

          <div className="flex flex-1 gap-4 min-h-0">
            <div
              ref={scrollContainerRef}
              className="flex-1 overflow-auto border rounded-lg bg-card p-6"
            >
              {loading ? (
                <div className="flex items-center justify-center h-full text-muted-foreground">
                  <Icon name="Loader2" size={24} className="animate-spin mr-2" />
                  Загрузка...
                </div>
              ) : companyNodes.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-full text-muted-foreground gap-3">
                  <Icon name="Building2" size={48} />
                  <p>Компаний пока нет</p>
                  {isAdmin && (
                    <Button onClick={() => setCreatingCompany(true)} className="gap-2">
                      <Icon name="Plus" size={14} />
                      Создать первую компанию
                    </Button>
                  )}
                </div>
              ) : (
                <OrgChartTree
                  companyNodes={companyNodes}
                  selectedId={selectedDept}
                  expandedNodes={expandedNodes}
                  expandedCompanies={expandedCompanies}
                  onToggleExpand={(id) =>
                    setExpandedNodes((prev) => {
                      const next = new Set(prev);
                      if (next.has(id)) next.delete(id);
                      else next.add(id);
                      return next;
                    })
                  }
                  onToggleCompany={(key) =>
                    setExpandedCompanies((prev) => {
                      const next = new Set(prev);
                      if (next.has(key)) next.delete(key);
                      else next.add(key);
                      return next;
                    })
                  }
                  onSelect={(id) => setSelectedDept(id)}
                  onEdit={isAdmin ? (d) => setEditDept(d) : undefined}
                  onAddChild={
                    isAdmin
                      ? (parentId) => {
                          const parent = departments.find((d) => d.id === parentId);
                          setCreatingUnder({
                            parentId,
                            companyId: parent?.company_id ?? null,
                          });
                        }
                      : undefined
                  }
                  onDelete={isAdmin ? handleDeleteDept : undefined}
                  onAddRootDept={
                    isAdmin
                      ? (companyId) => setCreatingUnder({ parentId: null, companyId })
                      : undefined
                  }
                  onEditCompany={isAdmin ? (c) => setEditCompany(c) : undefined}
                  onDeleteCompany={isAdmin ? handleDeleteCompany : undefined}
                  onCreateCompany={isAdmin ? () => setCreatingCompany(true) : undefined}
                />
              )}
            </div>

            {selectedDept && panelData && (
              <DepartmentPanel
                data={panelData}
                isAdmin={isAdmin}
                onClose={() => setSelectedDept(null)}
                onEditDept={() => setEditDept(panelData.department)}
              />
            )}
          </div>
        </div>

        <DragOverlay>
          {activeDragUser && (
            <div className="bg-popover border rounded-md shadow-lg px-3 py-2 flex items-center gap-2">
              {activeDragUser.photo_url ? (
                <img
                  src={activeDragUser.photo_url}
                  alt=""
                  className="w-7 h-7 rounded-full object-cover"
                />
              ) : (
                <div className="w-7 h-7 rounded-full bg-muted flex items-center justify-center">
                  <Icon name="User" size={14} />
                </div>
              )}
              <span className="text-sm font-medium">{activeDragUser.full_name}</span>
            </div>
          )}
        </DragOverlay>
      </DndContext>

      <EditDepartmentDialog
        open={editDept !== null || creatingUnder !== null}
        mode={editDept ? 'edit' : 'create'}
        department={editDept}
        parentId={editDept ? editDept.parent_id : creatingUnder?.parentId ?? null}
        departments={departments}
        authHeaders={authHeaders}
        apiUrl={API_URL}
        onClose={() => {
          setEditDept(null);
          setCreatingUnder(null);
        }}
        onSave={async (name, headUserId) => {
          if (editDept) {
            await handleUpdateDept(editDept.id, name, headUserId);
          } else {
            await handleCreateDept(name, creatingUnder?.parentId ?? null, headUserId);
          }
          setEditDept(null);
          setCreatingUnder(null);
        }}
      />

      <EditCompanyDialog
        open={editCompany !== null || creatingCompany}
        mode={editCompany ? 'edit' : 'create'}
        initialName={editCompany?.name}
        onClose={() => {
          setEditCompany(null);
          setCreatingCompany(false);
        }}
        onSave={async (name) => {
          if (editCompany) {
            await handleUpdateCompany(editCompany.id, name);
          } else {
            await handleCreateCompany(name);
          }
          setEditCompany(null);
          setCreatingCompany(false);
        }}
      />
    </PageLayout>
  );
};

export default OrgChart;
