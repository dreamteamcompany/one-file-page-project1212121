import { useState } from 'react';
import PaymentsSidebar from '@/components/payments/PaymentsSidebar';
import { useAuth } from '@/contexts/AuthContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import Icon from '@/components/ui/icon';
import { Input } from '@/components/ui/input';
import { useTicketTemplates, TicketTemplate } from '@/hooks/useTicketTemplates';
import TemplatesTable from '@/components/ticket-templates/TemplatesTable';
import TemplateDialog from '@/components/ticket-templates/TemplateDialog';

const TicketTemplates = () => {
  const { hasPermission } = useAuth();
  const {
    templates,
    services,
    ticketServices,
    priorities,
    categories,
    loading,
    saveTemplate,
    deleteTemplate,
    loadDictionaries,
  } = useTicketTemplates();

  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingTemplate, setEditingTemplate] = useState<TicketTemplate | null>(null);
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

  if (!hasPermission('ticket_templates', 'read')) {
    return null;
  }

  const handleSubmit = (formData: {
    name: string;
    description: string;
    service_id: number;
    ticket_service_ids: number[];
    sla_hours: number;
    priority_id?: number;
    category_id?: number;
  }) => {
    saveTemplate(formData, editingTemplate);
    setEditingTemplate(null);
  };

  const handleEdit = (template: TicketTemplate) => {
    if (!hasPermission('ticket_templates', 'update')) {
      alert('У вас нет прав для редактирования шаблонов');
      return;
    }
    setEditingTemplate(template);
    setDialogOpen(true);
  };

  const openDialog = () => {
    loadDictionaries();
    setEditingTemplate(null);
    setDialogOpen(true);
  };

  const filteredTemplates = templates.filter(
    (template) =>
      template.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (template.description &&
        template.description.toLowerCase().includes(searchQuery.toLowerCase())) ||
      (template.service_name &&
        template.service_name.toLowerCase().includes(searchQuery.toLowerCase()))
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
        <header className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6 md:mb-[30px] px-4 md:px-[25px] py-4 md:py-[18px] bg-[#1b2735] rounded-[8px]">
          <div className="flex items-center gap-3 w-full sm:w-auto">
            <button
              onClick={() => setMenuOpen(true)}
              className="lg:hidden p-2 hover:bg-white/10 rounded-md transition-colors"
            >
              <Icon name="Menu" size={24} className="text-white" />
            </button>
            <div>
              <h1 className="text-xl md:text-2xl font-bold text-white">Шаблоны заявок</h1>
              <p className="text-sm text-white/60">
                Готовые комбинации услуг, сервисов и SLA
              </p>
            </div>
          </div>
          <Button onClick={openDialog} className="w-full sm:w-auto">
            <Icon name="Plus" size={18} className="mr-2" />
            Создать шаблон
          </Button>
        </header>

        <div className="px-4 md:px-[25px]">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Все шаблоны</CardTitle>
              <div className="mt-4">
                <div className="relative">
                  <Icon
                    name="Search"
                    size={18}
                    className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground"
                  />
                  <Input
                    placeholder="Поиск шаблонов..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-10"
                  />
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <TemplatesTable
                templates={filteredTemplates}
                onEdit={handleEdit}
                onDelete={deleteTemplate}
                loading={loading}
              />
            </CardContent>
          </Card>
        </div>
      </main>

      <TemplateDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        editingTemplate={editingTemplate}
        services={services}
        ticketServices={ticketServices}
        priorities={priorities}
        categories={categories}
        onSubmit={handleSubmit}
      />
    </div>
  );
};

export default TicketTemplates;
