import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { apiFetch, API_URL } from '@/utils/api';
import PaymentsSidebar from '@/components/payments/PaymentsSidebar';
import { useAuth } from '@/contexts/AuthContext';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import Icon from '@/components/ui/icon';
import { Input } from '@/components/ui/input';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';

interface TicketStatus {
  id: number;
  name: string;
  color: string;
  is_closed: boolean;
  is_open: boolean;
  is_approval: boolean;
  is_approval_revoked: boolean;
  is_approved: boolean;
  is_waiting_response: boolean;
}

const predefinedColors = [
  { name: 'Серый', value: '#6b7280' },
  { name: 'Синий', value: '#3b82f6' },
  { name: 'Зелёный', value: '#22c55e' },
  { name: 'Жёлтый', value: '#eab308' },
  { name: 'Оранжевый', value: '#f97316' },
  { name: 'Красный', value: '#ef4444' },
  { name: 'Фиолетовый', value: '#a855f7' },
  { name: 'Розовый', value: '#ec4899' },
];

const TicketStatuses = () => {
  const { hasPermission } = useAuth();
  const navigate = useNavigate();
  const [statuses, setStatuses] = useState<TicketStatus[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingStatus, setEditingStatus] = useState<TicketStatus | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    color: '#3b82f6',
    is_closed: false,
    is_open: false,
    is_approval: false,
    is_approval_revoked: false,
    is_approved: false,
    is_waiting_response: false,
  });
  const [dictionariesOpen, setDictionariesOpen] = useState(true);
  const [menuOpen, setMenuOpen] = useState(false);
  const [touchStart, setTouchStart] = useState(0);
  const [touchEnd, setTouchEnd] = useState(0);

  useEffect(() => {
    if (!hasPermission('ticket_statuses', 'read')) {
      navigate('/tickets');
      return;
    }
    loadStatuses();
  }, [hasPermission, navigate]);

  if (!hasPermission('ticket_statuses', 'read')) {
    return null;
  }

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

  const loadStatuses = () => {
    apiFetch(`${API_URL}?endpoint=ticket-statuses`)
      .then(res => res.json())
      .then((data) => {
        setStatuses(Array.isArray(data) ? data : []);
        setLoading(false);
      })
      .catch(err => {
        console.error('Failed to load ticket statuses:', err);
        setStatuses([]);
        setLoading(false);
      });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    const requiredPermission = editingStatus ? 'update' : 'create';
    if (!hasPermission('ticket_statuses', requiredPermission)) {
      alert('У вас нет прав для этой операции');
      return;
    }
    
    try {
      const url = `${API_URL}?endpoint=ticket-statuses`;
      const method = editingStatus ? 'PUT' : 'POST';
      const body = editingStatus 
        ? { id: editingStatus.id, ...formData }
        : formData;

      const response = await apiFetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(body),
      });

      if (response.ok) {
        setDialogOpen(false);
        setEditingStatus(null);
        setFormData({ name: '', color: '#3b82f6', is_closed: false, is_open: false, is_approval: false, is_approval_revoked: false, is_approved: false, is_waiting_response: false });
        loadStatuses();
      }
    } catch (err) {
      console.error('Failed to save status:', err);
    }
  };

  const handleEdit = (status: TicketStatus) => {
    if (!hasPermission('ticket_statuses', 'update')) {
      alert('У вас нет прав для редактирования статусов');
      return;
    }
    
    setEditingStatus(status);
    setFormData({ 
      name: status.name, 
      color: status.color,
      is_closed: status.is_closed,
      is_open: status.is_open || false,
      is_approval: status.is_approval || false,
      is_approval_revoked: status.is_approval_revoked || false,
      is_approved: status.is_approved || false,
      is_waiting_response: status.is_waiting_response || false
    });
    setDialogOpen(true);
  };

  const handleDelete = async (id: number) => {
    if (!hasPermission('ticket_statuses', 'remove')) {
      alert('У вас нет прав для удаления статусов');
      return;
    }
    
    if (!confirm('Вы уверены, что хотите удалить этот статус?')) return;

    try {
      const response = await apiFetch(
        `${API_URL}?endpoint=ticket-statuses`,
        { 
          method: 'DELETE',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ id })
        }
      );

      if (response.ok) {
        loadStatuses();
      } else {
        const data = await response.json();
        alert(data.error || 'Не удалось удалить статус');
      }
    } catch (err) {
      console.error('Failed to delete status:', err);
    }
  };

  const handleDialogClose = (open: boolean) => {
    setDialogOpen(open);
    if (!open) {
      setEditingStatus(null);
      setFormData({ name: '', color: '#3b82f6', is_closed: false, is_open: false, is_approval: false, is_approval_revoked: false, is_approved: false, is_waiting_response: false });
    }
  };

  return (
    <div className="flex min-h-screen">
      <PaymentsSidebar
        menuOpen={menuOpen}
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

      <main className="lg:ml-[250px] p-4 md:p-6 lg:p-[30px] min-h-screen flex-1 overflow-x-hidden max-w-full">
        <header className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6 md:mb-[30px] px-4 md:px-[25px] py-4 md:py-[18px] bg-[#1b254b]/50 backdrop-blur-[20px] rounded-[15px] border border-white/10">
          <button
            onClick={() => setMenuOpen(!menuOpen)}
            className="lg:hidden p-2 text-white"
          >
            <Icon name="Menu" size={24} />
          </button>
          <div className="flex items-center gap-3 bg-card border border-white/10 rounded-[15px] px-4 md:px-5 py-2 md:py-[10px] w-full sm:w-[300px] lg:w-[400px]">
            <Icon name="Search" size={20} className="text-muted-foreground" />
            <Input 
              type="text" 
              placeholder="Поиск статусов..." 
              className="border-0 bg-transparent focus-visible:ring-0 focus-visible:ring-offset-0 p-0 h-auto"
            />
          </div>
          <div className="flex items-center gap-2 md:gap-3 px-3 md:px-[15px] py-2 md:py-[10px] rounded-[12px] bg-white/5 border border-white/10">
            <div className="w-8 h-8 md:w-9 md:h-9 rounded-[10px] bg-gradient-to-br from-primary to-secondary flex items-center justify-center font-bold text-white text-sm md:text-base">
              А
            </div>
            <div className="hidden sm:block">
              <div className="text-sm font-medium">Администратор</div>
              <div className="text-xs text-muted-foreground">Администратор</div>
            </div>
          </div>
        </header>

        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
          <div>
            <h1 className="text-2xl md:text-3xl font-bold mb-2">Статусы заявок</h1>
            <p className="text-sm md:text-base text-muted-foreground">Управление статусами для заявок</p>
          </div>
          <Dialog open={dialogOpen} onOpenChange={handleDialogClose}>
            <DialogTrigger asChild>
              <Button className="bg-primary hover:bg-primary/90 gap-2 w-full sm:w-auto">
                <Icon name="Plus" size={18} />
                <span className="sm:inline">Добавить статус</span>
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[425px]">
              <DialogHeader>
                <DialogTitle>
                  {editingStatus ? 'Редактировать статус' : 'Новый статус'}
                </DialogTitle>
                <DialogDescription>
                  {editingStatus 
                    ? 'Измените данные статуса' 
                    : 'Добавьте новый статус заявки'}
                </DialogDescription>
              </DialogHeader>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="name">Название</Label>
                  <Input
                    id="name"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    placeholder="Название статуса"
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label>Цвет</Label>
                  <div className="grid grid-cols-4 gap-2">
                    {predefinedColors.map((colorOption) => (
                      <button
                        key={colorOption.value}
                        type="button"
                        onClick={() => setFormData({ ...formData, color: colorOption.value })}
                        className={`h-12 rounded-lg border-2 transition-all hover:scale-105 ${
                          formData.color === colorOption.value 
                            ? 'border-white shadow-lg' 
                            : 'border-transparent'
                        }`}
                        style={{ backgroundColor: colorOption.value }}
                        title={colorOption.name}
                      />
                    ))}
                  </div>
                  <div className="flex items-center gap-2 mt-2">
                    <Label htmlFor="custom-color" className="text-sm">Свой цвет:</Label>
                    <input
                      id="custom-color"
                      type="color"
                      value={formData.color}
                      onChange={(e) => setFormData({ ...formData, color: e.target.value })}
                      className="h-10 w-20 rounded cursor-pointer"
                    />
                    <span className="text-sm text-muted-foreground">{formData.color}</span>
                  </div>
                </div>
                <div className="space-y-3">
                  <div className="flex items-center space-x-2">
                    <Checkbox
                      id="is_open"
                      checked={formData.is_open}
                      onCheckedChange={(checked) => 
                        setFormData({ ...formData, is_open: checked as boolean, is_closed: checked ? false : formData.is_closed, is_approval: checked ? false : formData.is_approval, is_approval_revoked: checked ? false : formData.is_approval_revoked, is_approved: checked ? false : formData.is_approved, is_waiting_response: checked ? false : formData.is_waiting_response })
                      }
                    />
                    <Label
                      htmlFor="is_open"
                      className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 cursor-pointer"
                    >
                      Открытый статус (заявка открыта)
                    </Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Checkbox
                      id="is_approval"
                      checked={formData.is_approval}
                      onCheckedChange={(checked) => 
                        setFormData({ ...formData, is_approval: checked as boolean, is_closed: checked ? false : formData.is_closed, is_open: checked ? false : formData.is_open, is_approval_revoked: checked ? false : formData.is_approval_revoked, is_approved: checked ? false : formData.is_approved, is_waiting_response: checked ? false : formData.is_waiting_response })
                      }
                    />
                    <Label
                      htmlFor="is_approval"
                      className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 cursor-pointer"
                    >
                      Согласующий статус (заявка на согласовании)
                    </Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Checkbox
                      id="is_approved"
                      checked={formData.is_approved}
                      onCheckedChange={(checked) => 
                        setFormData({ ...formData, is_approved: checked as boolean, is_closed: checked ? false : formData.is_closed, is_open: checked ? false : formData.is_open, is_approval: checked ? false : formData.is_approval, is_approval_revoked: checked ? false : formData.is_approval_revoked, is_waiting_response: checked ? false : formData.is_waiting_response })
                      }
                    />
                    <Label
                      htmlFor="is_approved"
                      className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 cursor-pointer"
                    >
                      Согласовано (заявка согласована всеми согласующими)
                    </Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Checkbox
                      id="is_approval_revoked"
                      checked={formData.is_approval_revoked}
                      onCheckedChange={(checked) => 
                        setFormData({ ...formData, is_approval_revoked: checked as boolean, is_closed: checked ? false : formData.is_closed, is_open: checked ? false : formData.is_open, is_approval: checked ? false : formData.is_approval, is_approved: checked ? false : formData.is_approved, is_waiting_response: checked ? false : formData.is_waiting_response })
                      }
                    />
                    <Label
                      htmlFor="is_approval_revoked"
                      className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 cursor-pointer"
                    >
                      Согласование отозвано (заявка была на согласовании, но отозвана)
                    </Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Checkbox
                      id="is_waiting_response"
                      checked={formData.is_waiting_response}
                      onCheckedChange={(checked) => 
                        setFormData({ ...formData, is_waiting_response: checked as boolean, is_closed: checked ? false : formData.is_closed, is_open: checked ? false : formData.is_open, is_approval: checked ? false : formData.is_approval, is_approval_revoked: checked ? false : formData.is_approval_revoked, is_approved: checked ? false : formData.is_approved })
                      }
                    />
                    <Label
                      htmlFor="is_waiting_response"
                      className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 cursor-pointer"
                    >
                      Ожидание ответа (заявка ожидает ответа от исполнителя)
                    </Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Checkbox
                      id="is_closed"
                      checked={formData.is_closed}
                      onCheckedChange={(checked) => 
                        setFormData({ ...formData, is_closed: checked as boolean, is_open: checked ? false : formData.is_open, is_approval: checked ? false : formData.is_approval, is_approval_revoked: checked ? false : formData.is_approval_revoked, is_approved: checked ? false : formData.is_approved, is_waiting_response: checked ? false : formData.is_waiting_response })
                      }
                    />
                    <Label
                      htmlFor="is_closed"
                      className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 cursor-pointer"
                    >
                      Закрытый статус (заявка завершена)
                    </Label>
                  </div>
                </div>
                <div className="flex gap-2 pt-4">
                  <Button type="submit" className="flex-1">
                    {editingStatus ? 'Сохранить' : 'Создать'}
                  </Button>
                  <Button 
                    type="button" 
                    variant="outline" 
                    onClick={() => handleDialogClose(false)}
                  >
                    Отмена
                  </Button>
                </div>
              </form>
            </DialogContent>
          </Dialog>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-12">
            <Icon name="Loader2" size={32} className="animate-spin text-primary" />
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {statuses.map((status) => (
              <Card key={status.id} className="bg-card border-white/10">
                <CardContent className="p-4">
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex items-center gap-3 flex-1">
                      <div 
                        className="w-4 h-4 rounded-full flex-shrink-0"
                        style={{ backgroundColor: status.color }}
                      />
                      <div className="flex-1 min-w-0">
                        <h3 className="font-semibold text-base truncate">{status.name}</h3>
                        {status.is_open && (
                          <p className="text-xs text-green-600 dark:text-green-400 mt-1">
                            <Icon name="Unlock" size={12} className="inline mr-1" />
                            Открытый статус
                          </p>
                        )}
                        {status.is_approval && (
                          <p className="text-xs text-blue-600 dark:text-blue-400 mt-1">
                            <Icon name="FileCheck" size={12} className="inline mr-1" />
                            Согласующий статус
                          </p>
                        )}
                        {status.is_approved && (
                          <p className="text-xs text-green-600 dark:text-green-400 mt-1">
                            <Icon name="CheckCircle" size={12} className="inline mr-1" />
                            Согласовано
                          </p>
                        )}
                        {status.is_approval_revoked && (
                          <p className="text-xs text-orange-600 dark:text-orange-400 mt-1">
                            <Icon name="XCircle" size={12} className="inline mr-1" />
                            Согласование отозвано
                          </p>
                        )}
                        {status.is_closed && (
                          <p className="text-xs text-muted-foreground mt-1">
                            <Icon name="Lock" size={12} className="inline mr-1" />
                            Закрытый статус
                          </p>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-1 flex-shrink-0">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleEdit(status)}
                        className="h-8 w-8 p-0"
                      >
                        <Icon name="Pencil" size={14} />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleDelete(status.id)}
                        className="h-8 w-8 p-0 text-red-500 hover:text-red-600"
                      >
                        <Icon name="Trash2" size={14} />
                      </Button>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <div 
                      className="px-3 py-1 rounded-full text-xs font-medium"
                      style={{ 
                        backgroundColor: `${status.color}20`,
                        color: status.color 
                      }}
                    >
                      Превью статуса
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}

        {!loading && statuses.length === 0 && (
          <Card className="bg-card border-white/10">
            <CardContent className="p-12 text-center">
              <Icon name="FileText" size={48} className="mx-auto mb-4 text-muted-foreground" />
              <h3 className="text-lg font-semibold mb-2">Нет статусов</h3>
              <p className="text-muted-foreground mb-6">
                Начните с создания первого статуса заявки
              </p>
              <Button onClick={() => setDialogOpen(true)} className="gap-2">
                <Icon name="Plus" size={18} />
                Добавить статус
              </Button>
            </CardContent>
          </Card>
        )}
      </main>
    </div>
  );
};

export default TicketStatuses;