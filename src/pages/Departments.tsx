import { useState, useEffect } from 'react';
import { Plus, Search } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useAuth } from '@/contexts/AuthContext';
import { apiFetch } from '@/utils/api';
import { Department, Company, Position, DepartmentPosition } from '@/types';
import DepartmentTree from '@/components/departments/DepartmentTree';
import Icon from '@/components/ui/icon';
import { Checkbox } from '@/components/ui/checkbox';
import PageLayout from '@/components/layout/PageLayout';
import AppHeader from '@/components/layout/AppHeader';

const Departments = () => {
  const { hasPermission } = useAuth();
  const [menuOpen, setMenuOpen] = useState(false);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [companies, setCompanies] = useState<Company[]>([]);
  const [positions, setPositions] = useState<Position[]>([]);
  const [departmentPositions, setDepartmentPositions] = useState<DepartmentPosition[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCompany, setSelectedCompany] = useState<string>('');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingDepartment, setEditingDepartment] = useState<Department | null>(null);
  const [parentIdForNew, setParentIdForNew] = useState<number | null>(null);
  const [formData, setFormData] = useState({
    company_id: '',
    parent_id: '',
    name: '',
    code: '',
    description: '',
    position_ids: [] as number[],
  });
  const [syncing, setSyncing] = useState(false);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      console.log('[loadData] Starting data fetch...');
      const [depsRes, compsRes, posRes, depPosRes] = await Promise.all([
        apiFetch('/departments'),
        apiFetch('/companies'),
        apiFetch('/positions'),
        apiFetch('/department-positions'),
      ]);
      const [depsData, compsData, posData, depPosData] = await Promise.all([
        depsRes.json(),
        compsRes.json(),
        posRes.json(),
        depPosRes.json(),
      ]);
      console.log('[loadData] Departments received:', depsData?.length || 0, depsData);
      console.log('[loadData] Companies received:', compsData?.length || 0, compsData);
      console.log('[loadData] Positions received:', posData?.length || 0);
      console.log('[loadData] Dept-Positions received:', depPosData?.length || 0);
      setDepartments(Array.isArray(depsData) ? depsData : []);
      setCompanies(Array.isArray(compsData) ? compsData : []);
      setPositions(Array.isArray(posData) ? posData : []);
      setDepartmentPositions(Array.isArray(depPosData) ? depPosData : []);
    } catch (error) {
      console.error('Failed to load data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const payload = {
        company_id: parseInt(formData.company_id),
        parent_id: formData.parent_id ? parseInt(formData.parent_id) : null,
        name: formData.name,
        code: formData.code || null,
        description: formData.description || null,
        position_ids: formData.position_ids,
      };

      if (editingDepartment) {
        await apiFetch(`/departments/${editingDepartment.id}`, {
          method: 'PUT',
          body: JSON.stringify(payload),
        });
      } else {
        await apiFetch('/departments', {
          method: 'POST',
          body: JSON.stringify(payload),
        });
      }
      setDialogOpen(false);
      setEditingDepartment(null);
      setParentIdForNew(null);
      setFormData({
        company_id: '',
        parent_id: '',
        name: '',
        code: '',
        description: '',
        position_ids: [],
      });
      loadData();
    } catch (error) {
      console.error('Failed to save department:', error);
    }
  };

  const handleEdit = (department: Department) => {
    setEditingDepartment(department);
    const depPos = Array.isArray(departmentPositions)
      ? departmentPositions
          .filter((dp) => dp.department_id === department.id)
          .map((dp) => dp.position_id)
      : [];
    setFormData({
      company_id: department.company_id.toString(),
      parent_id: department.parent_id?.toString() || '',
      name: department.name,
      code: department.code || '',
      description: department.description || '',
      position_ids: depPos,
    });
    setDialogOpen(true);
  };

  const handleAddChild = (parentId: number) => {
    const parent = departments.find((d) => d.id === parentId);
    setParentIdForNew(parentId);
    setFormData({
      company_id: parent?.company_id.toString() || '',
      parent_id: parentId.toString(),
      name: '',
      code: '',
      description: '',
      position_ids: [],
    });
    setDialogOpen(true);
  };

  const handleDelete = async (id: number) => {
    if (!confirm('Вы уверены, что хотите удалить это подразделение?')) return;
    try {
      const response = await apiFetch(`/departments/${id}`, { method: 'DELETE' });
      if (response.ok) {
        loadData();
      }
    } catch (error) {
      console.error('Failed to delete department:', error);
    }
  };

  const filteredDepartments = departments.filter((dept) => {
    const matchesSearch = dept.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      dept.code?.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCompany = !selectedCompany || (dept.company_id && dept.company_id.toString() === selectedCompany);
    const passes = matchesSearch && matchesCompany;
    if (!passes && dept.id <= 10) {
      console.log('[filter]', dept.id, dept.name, 'search:', matchesSearch, 'company:', matchesCompany, 'selectedCompany:', selectedCompany, 'dept.company_id:', dept.company_id);
    }
    return passes;
  });

  const canCreate = hasPermission('departments', 'create');
  const canEdit = hasPermission('departments', 'update');
  const canDelete = hasPermission('departments', 'delete');

  const availableParents = editingDepartment
    ? departments.filter((d) =>
        d.id !== editingDepartment.id &&
        d.company_id &&
        d.company_id.toString() === formData.company_id
      )
    : departments.filter((d) => d.company_id && d.company_id.toString() === formData.company_id);

  const togglePosition = (positionId: number) => {
    setFormData((prev) => ({
      ...prev,
      position_ids: prev.position_ids.includes(positionId)
        ? prev.position_ids.filter((id) => id !== positionId)
        : [...prev.position_ids, positionId],
    }));
  };

  const handleSyncFromBitrix = async () => {
    let companyId = selectedCompany;
    
    if (!companyId) {
      if (companies.length === 0) {
        alert('Сначала создайте компанию');
        return;
      }
      if (companies.length === 1) {
        companyId = companies[0].id.toString();
      } else {
        alert('Выберите компанию из списка выше для синхронизации');
        return;
      }
    }

    if (!confirm('Синхронизировать подразделения из Bitrix24? Это может занять несколько минут для больших баз.')) {
      return;
    }

    setSyncing(true);
    let totalSynced = 0;
    let batchNumber = 0;
    
    try {
      console.log('Starting Bitrix24 sync for company:', companyId);
      
      while (true) {
        console.log(`Syncing batch ${batchNumber}...`);
        
        const controller = new AbortController();
        const timeoutId = setTimeout(() => {
          console.log('Request timeout, aborting...');
          controller.abort();
        }, 60000);
        
        try {
          const response = await apiFetch('https://functions.poehali.dev/1f366079-778d-425e-a0ba-378f356dceae', {
            method: 'POST',
            body: JSON.stringify({ 
              company_id: parseInt(companyId),
              batch_number: batchNumber,
              batch_size: 500
            }),
            signal: controller.signal,
          });
          
          clearTimeout(timeoutId);

          console.log(`Batch ${batchNumber} response status:`, response.status);
          
          if (!response.ok) {
            const error = await response.json().catch(() => ({ error: 'Network error' }));
            console.error('Sync error response:', error);
            throw new Error(error.error || 'Ошибка синхронизации');
          }
          
          const result = await response.json();
          console.log(`Batch ${batchNumber} result:`, result);
          
          totalSynced += result.synced_count;
          
          if (!result.has_more) {
            console.log('All batches synced, stopping');
            break;
          }
          
          batchNumber++;
          
        } catch (fetchError: unknown) {
          clearTimeout(timeoutId);
          
          if (fetchError instanceof Error && fetchError.name === 'AbortError') {
            console.error('Request aborted due to timeout');
            throw new Error('Превышен лимит ожидания. Попробуйте позже.');
          }
          throw fetchError;
        }
      }
      
      console.log(`Sync completed! Total: ${totalSynced}`);
      alert(`Синхронизация завершена! Обработано ${totalSynced} подразделений из Bitrix24`);
      loadData();
      
    } catch (error) {
      console.error('Sync error:', error);
      alert(`Ошибка при синхронизации с Bitrix24: ${error instanceof Error ? error.message : 'Неизвестная ошибка'}`);
    } finally {
      console.log('Sync finished, setting syncing to false');
      setSyncing(false);
    }
  };

  if (loading) {
    return (
      <PageLayout menuOpen={menuOpen} setMenuOpen={setMenuOpen}>
        <AppHeader menuOpen={menuOpen} setMenuOpen={setMenuOpen} />
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
        </div>
      </PageLayout>
    );
  }

  return (
    <PageLayout menuOpen={menuOpen} setMenuOpen={setMenuOpen}>
      <AppHeader menuOpen={menuOpen} setMenuOpen={setMenuOpen} />
      <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Подразделения</h1>
          <p className="text-muted-foreground mt-1">Древовидная структура подразделений компании</p>
        </div>
        {canCreate && (
          <div className="flex gap-2">
            <Button
              variant="outline"
              onClick={handleSyncFromBitrix}
              disabled={syncing}
            >
              <Icon name="RefreshCw" className={`mr-2 h-4 w-4 ${syncing ? 'animate-spin' : ''}`} />
              {syncing ? 'Синхронизация...' : 'Синхронизировать из Bitrix24'}
            </Button>
            <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
              <DialogTrigger asChild>
                <Button onClick={() => {
                  setEditingDepartment(null);
                  setParentIdForNew(null);
                  setFormData({
                    company_id: '',
                    parent_id: '',
                    name: '',
                    code: '',
                    description: '',
                    position_ids: [],
                  });
                }}>
                  <Icon name="Plus" className="mr-2 h-4 w-4" />
                  Добавить подразделение
                </Button>
              </DialogTrigger>
            <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>
                  {editingDepartment
                    ? 'Редактирование подразделения'
                    : parentIdForNew
                    ? 'Новое дочернее подразделение'
                    : 'Новое подразделение'}
                </DialogTitle>
              </DialogHeader>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="company_id">Компания *</Label>
                  <Select
                    value={formData.company_id}
                    onValueChange={(value) => setFormData({ ...formData, company_id: value, parent_id: '' })}
                    required
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Выберите компанию" />
                    </SelectTrigger>
                    <SelectContent>
                      {companies.map((company) => (
                        <SelectItem key={company.id} value={company.id.toString()}>
                          {company.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {formData.company_id && (
                  <div className="space-y-2">
                    <Label htmlFor="parent_id">Родительское подразделение</Label>
                    <Select
                      value={formData.parent_id || 'root'}
                      onValueChange={(value) => setFormData({ ...formData, parent_id: value === 'root' ? '' : value })}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Корневое подразделение" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="root">Корневое подразделение</SelectItem>
                        {availableParents.map((dept) => (
                          <SelectItem key={dept.id} value={dept.id.toString()}>
                            {dept.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                )}

                <div className="space-y-2">
                  <Label htmlFor="name">Название подразделения *</Label>
                  <Input
                    id="name"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="code">Код подразделения</Label>
                  <Input
                    id="code"
                    value={formData.code}
                    onChange={(e) => setFormData({ ...formData, code: e.target.value })}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="description">Описание</Label>
                  <Textarea
                    id="description"
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    rows={3}
                  />
                </div>

                <div className="space-y-2">
                  <Label>Должности в подразделении</Label>
                  <div className="border rounded-md p-4 max-h-48 overflow-y-auto space-y-2">
                    {positions.length === 0 ? (
                      <p className="text-sm text-muted-foreground">Должности не найдены</p>
                    ) : (
                      positions.map((position) => (
                        <div key={position.id} className="flex items-center space-x-2">
                          <Checkbox
                            id={`position-${position.id}`}
                            checked={formData.position_ids.includes(position.id)}
                            onCheckedChange={() => togglePosition(position.id)}
                          />
                          <label
                            htmlFor={`position-${position.id}`}
                            className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                          >
                            {position.name}
                          </label>
                        </div>
                      ))
                    )}
                  </div>
                </div>

                <div className="flex justify-end gap-2">
                  <Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>
                    Отмена
                  </Button>
                  <Button type="submit">
                    {editingDepartment ? 'Сохранить' : 'Создать'}
                  </Button>
                </div>
              </form>
            </DialogContent>
          </Dialog>
          </div>
        )}
      </div>

      <div className="flex items-center gap-4">
        <div className="relative flex-1">
          <Icon name="Search" className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Поиск по названию или коду..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
          />
        </div>
        <Select value={selectedCompany || 'all'} onValueChange={(value) => setSelectedCompany(value === 'all' ? '' : value)}>
          <SelectTrigger className="w-64">
            <SelectValue placeholder="Все компании" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Все компании</SelectItem>
            {companies.map((company) => (
              <SelectItem key={company.id} value={company.id.toString()}>
                {company.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="rounded-lg border bg-card p-4">
        <DepartmentTree
          departments={filteredDepartments}
          onEdit={canEdit ? handleEdit : undefined}
          onDelete={canDelete ? handleDelete : undefined}
          onAddChild={canCreate ? handleAddChild : undefined}
          canEdit={canEdit}
          canDelete={canDelete}
          canCreate={canCreate}
        />
      </div>
    </div>
    </PageLayout>
  );
};

export default Departments;