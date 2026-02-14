import { useState } from 'react';
import Icon from '@/components/ui/icon';
import { Button } from '@/components/ui/button';
import PageLayout from '@/components/layout/PageLayout';
import AppHeader from '@/components/layout/AppHeader';
import GroupDialog from '@/components/executor-groups/GroupDialog';
import GroupCard from '@/components/executor-groups/GroupCard';
import MembersPanel from '@/components/executor-groups/MembersPanel';
import MappingsPanel from '@/components/executor-groups/MappingsPanel';
import {
  useExecutorGroups,
  useGroupMembers,
  useGroupMappings,
  useReferenceData,
  type ExecutorGroup,
} from '@/hooks/useExecutorGroups';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';

const ExecutorGroups = () => {
  const { groups, loading, createGroup, updateGroup, removeGroup } = useExecutorGroups();
  const ref = useReferenceData();
  const [menuOpen, setMenuOpen] = useState(false);

  const [selectedGroup, setSelectedGroup] = useState<ExecutorGroup | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingGroup, setEditingGroup] = useState<ExecutorGroup | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<ExecutorGroup | null>(null);

  const membersHook = useGroupMembers(selectedGroup?.id ?? null);
  const mappingsHook = useGroupMappings(selectedGroup?.id ?? null);

  const handleSave = async (data: {
    name: string;
    description: string;
    isActive: boolean;
    autoAssign: boolean;
    assignGroupOnly: boolean;
  }): Promise<boolean> => {
    if (editingGroup) {
      return updateGroup(
        editingGroup.id,
        data.name,
        data.description,
        data.isActive,
        data.autoAssign,
        data.assignGroupOnly,
      );
    }
    const result = await createGroup(data.name, data.description, data.autoAssign, data.assignGroupOnly);
    return !!result;
  };

  const handleEdit = (group: ExecutorGroup) => {
    setEditingGroup(group);
    setDialogOpen(true);
  };

  const confirmRemove = async () => {
    if (!deleteTarget) return;
    await removeGroup(deleteTarget.id);
    if (selectedGroup?.id === deleteTarget.id) {
      setSelectedGroup(null);
    }
    setDeleteTarget(null);
  };

  return (
    <PageLayout menuOpen={menuOpen} setMenuOpen={setMenuOpen}>
      <AppHeader menuOpen={menuOpen} setMenuOpen={setMenuOpen} />
      <header className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-bold">Группы исполнителей</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Управление группами и привязка к комбинациям услуга + сервис
          </p>
        </div>
        <GroupDialog
          open={dialogOpen}
          onOpenChange={setDialogOpen}
          editingGroup={editingGroup}
          onSave={handleSave}
          onReset={() => setEditingGroup(null)}
        />
      </header>

      <div className="flex flex-col lg:flex-row gap-6 flex-1">
        <div className="w-full lg:w-[340px] flex-shrink-0">
          <div className="sticky top-0">
            {loading ? (
              <div className="flex justify-center py-12">
                <Icon name="Loader2" size={32} className="animate-spin text-muted-foreground" />
              </div>
            ) : groups.length === 0 ? (
              <div className="text-center py-12 text-muted-foreground">
                <Icon name="UsersRound" size={48} className="mx-auto mb-3 opacity-30" />
                <p className="text-sm">Пока нет групп</p>
                <p className="text-xs mt-1">Создайте первую группу исполнителей</p>
              </div>
            ) : (
              <div className="space-y-2">
                {groups.map(group => (
                  <GroupCard
                    key={group.id}
                    group={group}
                    isSelected={selectedGroup?.id === group.id}
                    onSelect={setSelectedGroup}
                    onEdit={handleEdit}
                    onRemove={setDeleteTarget}
                  />
                ))}
              </div>
            )}
          </div>
        </div>

        <div className="flex-1 min-w-0">
          {!selectedGroup ? (
            <div className="flex flex-col items-center justify-center py-20 text-muted-foreground">
              <Icon name="MousePointerClick" size={48} className="mb-3 opacity-30" />
              <p className="text-sm">Выберите группу для настройки</p>
            </div>
          ) : (
            <div className="space-y-6">
              <div className="p-5 rounded-lg border bg-card">
                <MembersPanel
                  members={membersHook.members}
                  users={ref.users}
                  loading={membersHook.loading}
                  onAdd={membersHook.addMember}
                  onRemove={membersHook.removeMember}
                />
              </div>

              <div className="p-5 rounded-lg border bg-card">
                <MappingsPanel
                  mappings={mappingsHook.mappings}
                  ticketServices={ref.ticketServices}
                  services={ref.services}
                  loading={mappingsHook.loading}
                  getServicesForTicketService={ref.getServicesForTicketService}
                  onAdd={mappingsHook.addMapping}
                  onRemove={mappingsHook.removeMapping}
                />
              </div>
            </div>
          )}
        </div>
      </div>

      <AlertDialog open={!!deleteTarget} onOpenChange={(v) => { if (!v) setDeleteTarget(null); }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Удалить группу?</AlertDialogTitle>
            <AlertDialogDescription>
              Группа «{deleteTarget?.name}» будет удалена. Все привязки к услугам также будут удалены.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Отмена</AlertDialogCancel>
            <AlertDialogAction onClick={confirmRemove} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              Удалить
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </PageLayout>
  );
};

export default ExecutorGroups;