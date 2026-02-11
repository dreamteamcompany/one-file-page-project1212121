import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import PaymentsSidebar from '@/components/payments/PaymentsSidebar';
import TicketServicesTable from '@/components/ticket-services/TicketServicesTable';
import TicketServiceDialog from '@/components/ticket-services/TicketServiceDialog';
import { useTicketServices, type TicketService } from '@/hooks/useTicketServices';

const TicketServicesManagement = () => {
  const {
    ticketServices,
    services,
    categories,
    loading,
    saveTicketService,
    deleteTicketService,
  } = useTicketServices();

  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingService, setEditingService] = useState<TicketService | null>(null);
  const [menuOpen, setMenuOpen] = useState(false);
  const [dictionariesOpen, setDictionariesOpen] = useState(true);
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

  const handleEdit = (ticketService: TicketService) => {
    setEditingService(ticketService);
    setDialogOpen(true);
  };

  const handleReset = () => {
    setEditingService(null);
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

      <div className="flex-1 overflow-auto">
        <div className="sticky top-0 z-10 bg-background border-b px-4 py-3 flex items-center justify-between lg:hidden">
          <h1 className="text-lg font-semibold">Услуги заявок</h1>
          <button
            onClick={() => setMenuOpen(!menuOpen)}
            className="p-2 hover:bg-accent rounded-lg transition-colors"
          >
            <svg
              className="w-6 h-6"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              {menuOpen ? (
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M6 18L18 6M6 6l12 12"
                />
              ) : (
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M4 6h16M4 12h16M4 18h16"
                />
              )}
            </svg>
          </button>
        </div>

        <div className="p-4 lg:p-8 max-w-7xl mx-auto">
          <div className="mb-6 flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold hidden lg:block">Услуги заявок</h1>
              <p className="text-sm text-muted-foreground mt-1">
                Управление наборами услуг для быстрого создания заявок
              </p>
            </div>
            <TicketServiceDialog
              open={dialogOpen}
              onOpenChange={setDialogOpen}
              editingService={editingService}
              services={services}
              categories={categories}
              onSave={saveTicketService}
              onReset={handleReset}
            />
          </div>

          <Card>
            <CardHeader>
              <CardTitle>Список услуг заявок</CardTitle>
            </CardHeader>
            <CardContent>
              <TicketServicesTable
                ticketServices={ticketServices}
                loading={loading}
                onEdit={handleEdit}
                onDelete={deleteTicketService}
              />
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default TicketServicesManagement;
