import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { apiFetch } from '@/utils/api';
import { Department, Company, Position, DepartmentPosition } from '@/types';
import DepartmentTree from '@/components/departments/DepartmentTree';
import PageLayout from '@/components/layout/PageLayout';
import AppHeader from '@/components/layout/AppHeader';
import DepartmentsHeader from '@/components/departments/DepartmentsHeader';
import DepartmentsFilters from '@/components/departments/DepartmentsFilters';
import DepartmentFormDialog from '@/components/departments/DepartmentFormDialog';

interface FormData {
  company_id: string;
  parent_id: string;
  name: string;
  code: string;
  description: string;
  position_ids: number[];
}

const emptyForm: FormData = {
  company_id: '',
  parent_id: '',
  name: '',
  code: '',
  description: '',
  position_ids: [],
};

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
  const [formData, setFormData] = useState<FormData>(emptyForm);
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
      setFormData(emptyForm);
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
    if (!confirm('Удалить подразделение и все дочерние? Это действие необратимо.')) return;
    try {
      const response = await apiFetch(`/departments/${id}`, { method: 'DELETE' });
      if (response.ok) {
        loadData();
      }
    } catch (error) {
      console.error('Failed to delete department:', error);
    }
  };

  const handleDeactivate = async (id: number) => {
    if (!confirm('Деактивировать подразделение и все дочерние?')) return;
    try {
      const response = await apiFetch(`/departments/${id}`, {
        method: 'PATCH',
        body: JSON.stringify({ is_active: false }),
      });
      if (response.ok) {
        loadData();
      }
    } catch (error) {
      console.error('Failed to deactivate department:', error);
    }
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
              batch_size: 500,
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

  const filteredDepartments = departments.filter((dept) => {
    const matchesSearch =
      dept.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      dept.code?.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCompany =
      !selectedCompany || (dept.company_id && dept.company_id.toString() === selectedCompany);
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
    ? departments.filter(
        (d) =>
          d.id !== editingDepartment.id &&
          d.company_id &&
          d.company_id.toString() === formData.company_id
      )
    : departments.filter((d) => d.company_id && d.company_id.toString() === formData.company_id);

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
        <DepartmentsHeader
          canCreate={canCreate}
          syncing={syncing}
          dialogOpen={dialogOpen}
          onDialogOpenChange={setDialogOpen}
          onSyncFromBitrix={handleSyncFromBitrix}
          onNewDepartment={() => {
            setEditingDepartment(null);
            setParentIdForNew(null);
            setFormData(emptyForm);
          }}
        />

        <DepartmentsFilters
          searchQuery={searchQuery}
          onSearchChange={setSearchQuery}
          selectedCompany={selectedCompany}
          onCompanyChange={setSelectedCompany}
          companies={companies}
        />

        <DepartmentFormDialog
          open={dialogOpen}
          onOpenChange={setDialogOpen}
          editingDepartment={editingDepartment}
          parentIdForNew={parentIdForNew}
          formData={formData}
          onFormDataChange={setFormData}
          companies={companies}
          availableParents={availableParents}
          positions={positions}
          onSubmit={handleSubmit}
        />

        <DepartmentTree
          departments={filteredDepartments}
          departmentPositions={departmentPositions}
          positions={positions}
          onEdit={canEdit ? handleEdit : undefined}
          onDelete={canDelete ? handleDelete : undefined}
          onDeactivate={canDelete ? handleDeactivate : undefined}
          onAddChild={canCreate ? handleAddChild : undefined}
        />
      </div>
    </PageLayout>
  );
};

export default Departments;
