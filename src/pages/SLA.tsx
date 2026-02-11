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
} from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

interface SLA {
  id: number;
  name: string;
  response_time_hours: number;
  response_notification_hours: number;
  no_response_hours?: number;
  no_response_status_id?: number;
  resolution_time_hours: number;
  resolution_notification_hours: number;
  created_at?: string;
  updated_at?: string;
}

interface TicketStatus {
  id: number;
  name: string;
  color: string;
}

const SLA = () => {
  const { hasPermission } = useAuth();
  const navigate = useNavigate();
  const [slas, setSlas] = useState<SLA[]>([]);
  const [statuses, setStatuses] = useState<TicketStatus[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingSla, setEditingSla] = useState<SLA | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    response_time_hours: 4,
    response_notification_hours: 3,
    no_response_hours: 24,
    no_response_status_id: undefined as number | undefined,
    resolution_time_hours: 24,
    resolution_notification_hours: 20,
  });
  const [dictionariesOpen, setDictionariesOpen] = useState(true);
  const [menuOpen, setMenuOpen] = useState(false);
  const [touchStart, setTouchStart] = useState(0);
  const [touchEnd, setTouchEnd] = useState(0);

  useEffect(() => {
    if (!hasPermission('sla', 'read')) {
      navigate('/tickets');
      return;
    }
    loadSlas();
    loadStatuses();
  }, [hasPermission, navigate]);

  if (!hasPermission('sla', 'read')) {
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

  const loadSlas = () => {
    apiFetch(`${API_URL}?endpoint=sla`)
      .then(res => res.json())
      .then((data) => {
        setSlas(Array.isArray(data) ? data : []);
        setLoading(false);
      })
      .catch(err => {
        console.error('Failed to load SLAs:', err);
        setSlas([]);
        setLoading(false);
      });
  };

  const loadStatuses = () => {
    apiFetch(`${API_URL}?endpoint=ticket-statuses`)
      .then(res => res.json())
      .then((data) => {
        setStatuses(Array.isArray(data) ? data : []);
      })
      .catch(err => {
        console.error('Failed to load statuses:', err);
        setStatuses([]);
      });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    const requiredPermission = editingSla ? 'update' : 'create';
    if (!hasPermission('sla', requiredPermission)) {
      alert('У вас нет прав для этой операции');
      return;
    }
    
    try {
      const url = `${API_URL}?endpoint=sla`;
      const method = editingSla ? 'PUT' : 'POST';
      const body = editingSla 
        ? { id: editingSla.id, ...formData }
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
        setEditingSla(null);
        setFormData({
          name: '',
          response_time_hours: 4,
          response_notification_hours: 3,
          no_response_hours: 24,
          no_response_status_id: undefined,
          resolution_time_hours: 24,
          resolution_notification_hours: 20,
        });
        loadSlas();
      }
    } catch (err) {
      console.error('Failed to save SLA:', err);
    }
  };

  const handleEdit = (sla: SLA) => {
    if (!hasPermission('sla', 'update')) {
      alert('У вас нет прав для редактирования SLA');
      return;
    }
    
    setEditingSla(sla);
    setFormData({
      name: sla.name,
      response_time_hours: sla.response_time_hours,
      response_notification_hours: sla.response_notification_hours,
      no_response_hours: sla.no_response_hours || 24,
      no_response_status_id: sla.no_response_status_id,
      resolution_time_hours: sla.resolution_time_hours,
      resolution_notification_hours: sla.resolution_notification_hours,
    });
    setDialogOpen(true);
  };

  const handleDelete = async (id: number) => {
    if (!hasPermission('sla', 'remove')) {
      alert('У вас нет прав для удаления SLA');
      return;
    }
    
    if (!confirm('Вы уверены, что хотите удалить это SLA?')) return;

    try {
      const response = await apiFetch(
        `${API_URL}?endpoint=sla`,
        { 
          method: 'DELETE',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ id })
        }
      );

      if (response.ok) {
        loadSlas();
      } else {
        const data = await response.json();
        alert(data.error || 'Не удалось удалить SLA');
      }
    } catch (err) {
      console.error('Failed to delete SLA:', err);
    }
  };

  const handleDialogClose = (open: boolean) => {
    setDialogOpen(open);
    if (!open) {
      setEditingSla(null);
      setFormData({
        name: '',
        response_time_hours: 4,
        response_notification_hours: 3,
        no_response_hours: 24,
        no_response_status_id: undefined,
        resolution_time_hours: 24,
        resolution_notification_hours: 20,
      });
    }
  };

  const getStatusName = (statusId?: number) => {
    if (!statusId) return '—';
    const status = statuses.find(s => s.id === statusId);
    return status?.name || '—';
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
              placeholder="Поиск SLA..." 
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
            <h1 className="text-2xl md:text-3xl font-bold mb-2">SLA (Соглашения об уровне обслуживания)</h1>
            <p className="text-muted-foreground text-sm md:text-base">
              Управление временем реакции и решения заявок
            </p>
          </div>
          {hasPermission('sla', 'create') && (
            <Button 
              onClick={() => {
                setEditingSla(null);
                setDialogOpen(true);
              }}
              className="bg-gradient-to-r from-primary to-secondary hover:opacity-90"
            >
              <Icon name="Plus" size={20} className="mr-2" />
              Создать SLA
            </Button>
          )}
        </div>

        {loading ? (
          <div className="flex items-center justify-center h-64">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
          </div>
        ) : slas.length === 0 ? (
          <Card className="bg-card/50 border-white/10">
            <CardContent className="flex flex-col items-center justify-center py-12">
              <Icon name="Clock" size={64} className="text-muted-foreground mb-4 opacity-50" />
              <h3 className="text-xl font-semibold mb-2">SLA не найдены</h3>
              <p className="text-muted-foreground mb-4 text-center">
                Создайте первое соглашение об уровне обслуживания
              </p>
            </CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-1 gap-4">
            {slas.map((sla) => (
              <Card key={sla.id} className="bg-card/50 border-white/10 hover:border-white/20 transition-all">
                <CardContent className="p-4 md:p-6">
                  <div className="flex flex-col md:flex-row justify-between items-start gap-4">
                    <div className="flex-1 w-full">
                      <h3 className="text-lg font-semibold mb-4">{sla.name}</h3>
                      
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="space-y-3">
                          <div className="flex items-start gap-2">
                            <Icon name="Timer" size={18} className="text-primary mt-0.5" />
                            <div>
                              <div className="text-sm font-medium">Время реакции</div>
                              <div className="text-xs text-muted-foreground">{sla.response_time_hours} ч</div>
                            </div>
                          </div>
                          
                          <div className="flex items-start gap-2">
                            <Icon name="Bell" size={18} className="text-yellow-500 mt-0.5" />
                            <div>
                              <div className="text-sm font-medium">Уведомление о сроке реакции</div>
                              <div className="text-xs text-muted-foreground">Через {sla.response_notification_hours} ч</div>
                            </div>
                          </div>

                          {sla.no_response_hours && (
                            <div className="flex items-start gap-2">
                              <Icon name="AlertTriangle" size={18} className="text-orange-500 mt-0.5" />
                              <div>
                                <div className="text-sm font-medium">При отсутствии ответа</div>
                                <div className="text-xs text-muted-foreground">
                                  Через {sla.no_response_hours} ч → {getStatusName(sla.no_response_status_id)}
                                </div>
                              </div>
                            </div>
                          )}
                        </div>

                        <div className="space-y-3">
                          <div className="flex items-start gap-2">
                            <Icon name="CheckCircle2" size={18} className="text-green-500 mt-0.5" />
                            <div>
                              <div className="text-sm font-medium">Время решения</div>
                              <div className="text-xs text-muted-foreground">{sla.resolution_time_hours} ч</div>
                            </div>
                          </div>
                          
                          <div className="flex items-start gap-2">
                            <Icon name="Bell" size={18} className="text-yellow-500 mt-0.5" />
                            <div>
                              <div className="text-sm font-medium">Уведомление о сроке решения</div>
                              <div className="text-xs text-muted-foreground">Через {sla.resolution_notification_hours} ч</div>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>

                    <div className="flex gap-2">
                      {hasPermission('sla', 'update') && (
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleEdit(sla)}
                          className="hover:bg-white/5"
                        >
                          <Icon name="Pencil" size={18} />
                        </Button>
                      )}
                      {hasPermission('sla', 'remove') && (
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleDelete(sla.id)}
                          className="hover:bg-red-500/10 text-red-500"
                        >
                          <Icon name="Trash2" size={18} />
                        </Button>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}

        <Dialog open={dialogOpen} onOpenChange={handleDialogClose}>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>{editingSla ? 'Редактировать SLA' : 'Создать SLA'}</DialogTitle>
              <DialogDescription>
                Настройте параметры соглашения об уровне обслуживания
              </DialogDescription>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="space-y-2">
                <Label htmlFor="name">Название SLA</Label>
                <Input
                  id="name"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="Например: Стандартный SLA"
                  required
                />
              </div>

              <div className="border-t border-white/10 pt-4">
                <h3 className="text-sm font-semibold mb-4 flex items-center gap-2">
                  <Icon name="Timer" size={18} className="text-primary" />
                  Время реакции
                </h3>
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="response_time">Время реакции (часы)</Label>
                    <Input
                      id="response_time"
                      type="number"
                      min="1"
                      value={formData.response_time_hours}
                      onChange={(e) => setFormData({ ...formData, response_time_hours: parseInt(e.target.value) })}
                      required
                    />
                    <p className="text-xs text-muted-foreground">
                      Максимальное время для первого ответа на заявку
                    </p>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="response_notification">Уведомление о сроке реакции (часы)</Label>
                    <Input
                      id="response_notification"
                      type="number"
                      min="1"
                      value={formData.response_notification_hours}
                      onChange={(e) => setFormData({ ...formData, response_notification_hours: parseInt(e.target.value) })}
                      required
                    />
                    <p className="text-xs text-muted-foreground">
                      За сколько часов до окончания времени реакции отправить уведомление
                    </p>
                  </div>
                </div>
              </div>

              <div className="border-t border-white/10 pt-4">
                <h3 className="text-sm font-semibold mb-4 flex items-center gap-2">
                  <Icon name="AlertTriangle" size={18} className="text-orange-500" />
                  При отсутствии ответа
                </h3>
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="no_response_hours">Часов без ответа</Label>
                    <Input
                      id="no_response_hours"
                      type="number"
                      min="1"
                      value={formData.no_response_hours}
                      onChange={(e) => setFormData({ ...formData, no_response_hours: parseInt(e.target.value) })}
                    />
                    <p className="text-xs text-muted-foreground">
                      Если клиент не отвечает указанное время
                    </p>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="no_response_status">Перевести в статус</Label>
                    <Select
                      value={formData.no_response_status_id?.toString() || 'none'}
                      onValueChange={(value) => setFormData({ ...formData, no_response_status_id: value === 'none' ? undefined : parseInt(value) })}
                    >
                      <SelectTrigger id="no_response_status">
                        <SelectValue placeholder="Выберите статус" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="none">Не переводить</SelectItem>
                        {statuses.map((status) => (
                          <SelectItem key={status.id} value={status.id.toString()}>
                            {status.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </div>

              <div className="border-t border-white/10 pt-4">
                <h3 className="text-sm font-semibold mb-4 flex items-center gap-2">
                  <Icon name="CheckCircle2" size={18} className="text-green-500" />
                  Время решения
                </h3>
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="resolution_time">Время решения (часы)</Label>
                    <Input
                      id="resolution_time"
                      type="number"
                      min="1"
                      value={formData.resolution_time_hours}
                      onChange={(e) => setFormData({ ...formData, resolution_time_hours: parseInt(e.target.value) })}
                      required
                    />
                    <p className="text-xs text-muted-foreground">
                      Максимальное время для полного решения заявки
                    </p>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="resolution_notification">Уведомление о сроке решения (часы)</Label>
                    <Input
                      id="resolution_notification"
                      type="number"
                      min="1"
                      value={formData.resolution_notification_hours}
                      onChange={(e) => setFormData({ ...formData, resolution_notification_hours: parseInt(e.target.value) })}
                      required
                    />
                    <p className="text-xs text-muted-foreground">
                      За сколько часов до окончания времени решения отправить уведомление
                    </p>
                  </div>
                </div>
              </div>

              <div className="flex gap-2 pt-4">
                <Button type="submit" className="flex-1">
                  {editingSla ? 'Сохранить' : 'Создать'}
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
      </main>
    </div>
  );
};

export default SLA;