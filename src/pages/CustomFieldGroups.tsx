import { useState } from 'react';
import PaymentsSidebar from '@/components/payments/PaymentsSidebar';
import { useAuth } from '@/contexts/AuthContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import Icon from '@/components/ui/icon';
import { Input } from '@/components/ui/input';
import { useCustomFieldGroups, FieldGroup } from '@/hooks/useCustomFieldGroups';
import FieldGroupsTable from '@/components/custom-field-groups/FieldGroupsTable';
import FieldGroupDialog from '@/components/custom-field-groups/FieldGroupDialog';

const CustomFieldGroups = () => {
  const { hasPermission } = useAuth();
  const {
    fieldGroups,
    availableFields,
    saveFieldGroup,
    deleteFieldGroup,
    getFieldTypeLabel,
    getFieldTypeIcon,
    getFieldById,
  } = useCustomFieldGroups();

  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingGroup, setEditingGroup] = useState<FieldGroup | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [dictionariesOpen, setDictionariesOpen] = useState(true);
  const [menuOpen, setMenuOpen] = useState(false);
  const [collapsed, setCollapsed] = useState(false);
  const [touchStart, setTouchStart] = useState(0);
  const [touchEnd, setTouchEnd] = useState(0);

  const handleTouchStart = (e: React.TouchEvent) => {
    setTouchStart(e.targetTouches[0].clientX);
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    setTouchEnd(e.targetTouches[0].clientX);
  };

  const handleTouchEnd = () => {
    if (touchStart - touchEnd > 75) {
      setMenuOpen(false);
    }
  };

  if (!hasPermission('custom_field_groups', 'read')) {
    return null;
  }

  const handleSubmit = (formData: { name: string; description: string; field_ids: number[] }) => {
    saveFieldGroup(formData, editingGroup);
    setEditingGroup(null);
  };

  const handleEdit = (group: FieldGroup) => {
    if (!hasPermission('custom_field_groups', 'update')) {
      alert('У вас нет прав для редактирования групп полей');
      return;
    }
    setEditingGroup(group);
    setDialogOpen(true);
  };

  const openDialog = () => {
    setEditingGroup(null);
    setDialogOpen(true);
  };

  const filteredGroups = fieldGroups.filter(group =>
    group.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    (group.description && group.description.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  return (
    <div className="flex min-h-screen overflow-hidden">
      <PaymentsSidebar
        menuOpen={menuOpen}
        collapsed={collapsed}
        onToggleCollapse={() => setCollapsed(!collapsed)}
        dictionariesOpen={dictionariesOpen}
        setDictionariesOpen={setDictionariesOpen}
        settingsOpen={false}
        setSettingsOpen={() => {}}
        handleTouchStart={handleTouchStart}
        handleTouchMove={handleTouchMove}
        handleTouchEnd={handleTouchEnd}
      />

      {menuOpen && (
        <div 
          className="fixed inset-0 bg-black/50 z-40 lg:hidden"
          onClick={() => setMenuOpen(false)}
        />
      )}

      <main className="lg:ml-[250px] p-4 md:p-6 lg:p-[30px] pb-20 min-h-screen flex-1 overflow-y-auto overflow-x-hidden max-w-full">
        <div className="flex lg:hidden items-center gap-2 mb-4">
          <button 
            onClick={() => setMenuOpen(true)}
            className="p-2 hover:bg-white/10 rounded-md transition-colors"
          >
            <Icon name="Menu" size={24} className="text-white" />
          </button>
          <h1 className="text-lg font-bold text-white">Группы полей</h1>
        </div>

        <header className="hidden lg:flex flex-row justify-between items-center gap-4 mb-6 md:mb-[30px] px-[25px] py-[18px] bg-[#1b2735] rounded-[8px]">
          <div>
            <h1 className="text-2xl font-bold text-white">Группы полей</h1>
            <p className="text-sm text-white/60">Управление группами пользовательских полей</p>
          </div>
          <Button onClick={openDialog}>
            <Icon name="Plus" size={18} className="mr-2" />
            Создать группу
          </Button>
        </header>

        <div className="px-0 md:px-[25px]">
          <div className="flex items-center gap-2 mb-4 lg:hidden">
            <Button onClick={openDialog} className="w-full">
              <Icon name="Plus" size={18} className="mr-2" />
              Создать группу
            </Button>
          </div>

          <Card>
            <CardHeader>
              <CardTitle className="text-lg hidden md:block">Все группы полей</CardTitle>
              <div className="mt-0 md:mt-4">
                <div className="relative">
                  <Icon name="Search" size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    placeholder="Поиск групп..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-10"
                  />
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <FieldGroupsTable
                fieldGroups={filteredGroups}
                getFieldById={getFieldById}
                getFieldTypeIcon={getFieldTypeIcon}
                onEdit={handleEdit}
                onDelete={deleteFieldGroup}
              />
            </CardContent>
          </Card>
        </div>
      </main>

      <FieldGroupDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        editingGroup={editingGroup}
        availableFields={availableFields}
        getFieldTypeLabel={getFieldTypeLabel}
        getFieldTypeIcon={getFieldTypeIcon}
        onSubmit={handleSubmit}
      />
    </div>
  );
};

export default CustomFieldGroups;