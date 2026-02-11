import { useState } from 'react';
import Icon from '@/components/ui/icon';
import PaymentsSidebar from '@/components/payments/PaymentsSidebar';
import ServiceDialog from '@/components/services/ServiceDialog';
import ServicesTable from '@/components/services/ServicesTable';
import { useServices, type Service } from '@/hooks/useServices';

const Services = () => {
  const {
    services,
    users,
    departments,
    categories,
    loading,
    saveService,
    deleteService,
  } = useServices();

  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingService, setEditingService] = useState<Service | null>(null);
  const [menuOpen, setMenuOpen] = useState(false);
  const [dictionariesOpen, setDictionariesOpen] = useState(true);
  const [settingsOpen, setSettingsOpen] = useState(true);
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

  const handleEdit = (service: Service) => {
    setEditingService(service);
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
        settingsOpen={settingsOpen}
        setSettingsOpen={setSettingsOpen}
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
        <header className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
          <div className="flex items-center gap-4">
            <button
              onClick={() => setMenuOpen(!menuOpen)}
              className="lg:hidden p-2 text-white"
            >
              <Icon name="Menu" size={24} />
            </button>
            <h1 className="text-2xl font-bold">Сервисы</h1>
          </div>

          <ServiceDialog
            open={dialogOpen}
            onOpenChange={setDialogOpen}
            editingService={editingService}
            users={users}
            departments={departments}
            categories={categories}
            onSave={saveService}
            onReset={handleReset}
          />
        </header>

        <ServicesTable
          services={services}
          loading={loading}
          onEdit={handleEdit}
          onDelete={deleteService}
        />
      </main>
    </div>
  );
};

export default Services;
