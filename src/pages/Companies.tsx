import { useState, useEffect } from 'react';
import { Plus, Search, Building2, Edit, Trash2 } from 'lucide-react';
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
import { useAuth } from '@/contexts/AuthContext';
import { apiFetch } from '@/utils/api';
import { Company } from '@/types';
import Icon from '@/components/ui/icon';

const Companies = () => {
  const { hasPermission } = useAuth();
  const [companies, setCompanies] = useState<Company[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingCompany, setEditingCompany] = useState<Company | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    inn: '',
    kpp: '',
    legal_address: '',
  });

  useEffect(() => {
    loadCompanies();
  }, []);

  const loadCompanies = async () => {
    try {
      const response = await apiFetch('/companies');
      if (response.ok) {
        const data = await response.json();
        setCompanies(data);
      }
    } catch (error) {
      console.error('Failed to load companies:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (editingCompany) {
        await apiFetch(`/companies/${editingCompany.id}`, {
          method: 'PUT',
          body: JSON.stringify(formData),
        });
      } else {
        await apiFetch('/companies', {
          method: 'POST',
          body: JSON.stringify(formData),
        });
      }
      setDialogOpen(false);
      setEditingCompany(null);
      setFormData({ name: '', inn: '', kpp: '', legal_address: '' });
      loadCompanies();
    } catch (error) {
      console.error('Failed to save company:', error);
    }
  };

  const handleEdit = (company: Company) => {
    setEditingCompany(company);
    setFormData({
      name: company.name,
      inn: company.inn || '',
      kpp: company.kpp || '',
      legal_address: company.legal_address || '',
    });
    setDialogOpen(true);
  };

  const handleDelete = async (id: number) => {
    if (!confirm('Вы уверены, что хотите удалить эту компанию?')) return;
    try {
      const response = await apiFetch(`/companies/${id}`, { method: 'DELETE' });
      if (response.ok) {
        loadCompanies();
      }
    } catch (error) {
      console.error('Failed to delete company:', error);
    }
  };

  const filteredCompanies = companies.filter((company) =>
    company.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    company.inn?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const canCreate = hasPermission('companies', 'create');
  const canEdit = hasPermission('companies', 'update');
  const canDelete = hasPermission('companies', 'delete');

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Компании</h1>
          <p className="text-muted-foreground mt-1">Управление компаниями организации</p>
        </div>
        {canCreate && (
          <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
            <DialogTrigger asChild>
              <Button onClick={() => {
                setEditingCompany(null);
                setFormData({ name: '', inn: '', kpp: '', legal_address: '' });
              }}>
                <Icon name="Plus" className="mr-2 h-4 w-4" />
                Добавить компанию
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl">
              <DialogHeader>
                <DialogTitle>
                  {editingCompany ? 'Редактирование компании' : 'Новая компания'}
                </DialogTitle>
              </DialogHeader>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="name">Название компании *</Label>
                  <Input
                    id="name"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    required
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="inn">ИНН</Label>
                    <Input
                      id="inn"
                      value={formData.inn}
                      onChange={(e) => setFormData({ ...formData, inn: e.target.value })}
                      maxLength={12}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="kpp">КПП</Label>
                    <Input
                      id="kpp"
                      value={formData.kpp}
                      onChange={(e) => setFormData({ ...formData, kpp: e.target.value })}
                      maxLength={9}
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="legal_address">Юридический адрес</Label>
                  <Textarea
                    id="legal_address"
                    value={formData.legal_address}
                    onChange={(e) => setFormData({ ...formData, legal_address: e.target.value })}
                    rows={3}
                  />
                </div>

                <div className="flex justify-end gap-2">
                  <Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>
                    Отмена
                  </Button>
                  <Button type="submit">
                    {editingCompany ? 'Сохранить' : 'Создать'}
                  </Button>
                </div>
              </form>
            </DialogContent>
          </Dialog>
        )}
      </div>

      <div className="flex items-center gap-4">
        <div className="relative flex-1">
          <Icon name="Search" className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Поиск по названию или ИНН..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
          />
        </div>
      </div>

      <div className="rounded-lg border bg-card">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b bg-muted/50">
                <th className="px-4 py-3 text-left text-sm font-medium">Название</th>
                <th className="px-4 py-3 text-left text-sm font-medium">ИНН</th>
                <th className="px-4 py-3 text-left text-sm font-medium">КПП</th>
                <th className="px-4 py-3 text-left text-sm font-medium">Юридический адрес</th>
                <th className="px-4 py-3 text-left text-sm font-medium">Статус</th>
                {(canEdit || canDelete) && (
                  <th className="px-4 py-3 text-right text-sm font-medium">Действия</th>
                )}
              </tr>
            </thead>
            <tbody>
              {filteredCompanies.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-4 py-8 text-center text-muted-foreground">
                    <Icon name="Building2" className="mx-auto h-12 w-12 mb-2 opacity-20" />
                    <p>Компании не найдены</p>
                  </td>
                </tr>
              ) : (
                filteredCompanies.map((company) => (
                  <tr key={company.id} className="border-b last:border-0 hover:bg-muted/50">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <Icon name="Building2" className="h-4 w-4 text-muted-foreground" />
                        <span className="font-medium">{company.name}</span>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-sm text-muted-foreground">
                      {company.inn || '—'}
                    </td>
                    <td className="px-4 py-3 text-sm text-muted-foreground">
                      {company.kpp || '—'}
                    </td>
                    <td className="px-4 py-3 text-sm text-muted-foreground max-w-xs truncate">
                      {company.legal_address || '—'}
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                          company.is_active
                            ? 'bg-green-100 text-green-800'
                            : 'bg-gray-100 text-gray-800'
                        }`}
                      >
                        {company.is_active ? 'Активна' : 'Неактивна'}
                      </span>
                    </td>
                    {(canEdit || canDelete) && (
                      <td className="px-4 py-3">
                        <div className="flex items-center justify-end gap-2">
                          {canEdit && (
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleEdit(company)}
                            >
                              <Icon name="Edit" className="h-4 w-4" />
                            </Button>
                          )}
                          {canDelete && (
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleDelete(company.id)}
                            >
                              <Icon name="Trash2" className="h-4 w-4 text-destructive" />
                            </Button>
                          )}
                        </div>
                      </td>
                    )}
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default Companies;