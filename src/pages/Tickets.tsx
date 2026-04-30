/**
 * Страница управления заявками
 * Рефакторинг: разделено по Single Responsibility Principle
 * - Поиск вынесен в useTicketsSearch
 * - Режим просмотра в useTicketsView
 * - Bulk операции в useBulkTicketOperations
 * - UI переключения в TicketsViewToggle
 */
import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { useTicketsData } from '@/hooks/useTicketsData';
import { useTicketForm } from '@/hooks/useTicketForm';
import { useBulkTicketActions } from '@/hooks/useBulkTicketActions';
import { useTicketsSearch } from '@/hooks/useTicketsSearch';
import { useTicketsView } from '@/hooks/useTicketsView';
import { useBulkTicketOperations } from '@/hooks/useBulkTicketOperations';
import PageLayout from '@/components/layout/PageLayout';
import AppHeader from '@/components/layout/AppHeader';
import TicketsSearch from '@/components/tickets/TicketsSearch';
import TicketsViewToggle from '@/components/tickets/TicketsViewToggle';
import TicketForm from '@/components/tickets/TicketForm';
import TicketsList from '@/components/tickets/TicketsList';
import TicketsKanban from '@/components/tickets/TicketsKanban';
import BulkActionsBar from '@/components/tickets/BulkActionsBar';
import { apiFetch } from '@/utils/api';

const Tickets = () => {
  const { user, hasPermission } = useAuth();
  const navigate = useNavigate();
  const [menuOpen, setMenuOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  const {
    tickets,
    categories,
    priorities,
    statuses,
    departments,
    customFields,
    services,
    ticketServices,
    loading,
    page,
    totalPages,
    totalTickets,
    loadTickets,
    loadDictionaries,
    loadServices,
    showArchived,
    showHidden,
    hiddenCount,
    hideWaiting,
    toggleArchived,
    toggleHidden,
    toggleHideWaiting,
  } = useTicketsData();

  const { viewMode, setViewMode, bulkMode, toggleBulkMode, disableBulkMode } = useTicketsView();
  const filteredTickets = useTicketsSearch(tickets, searchQuery);

  const {
    selectedTicketIds,
    selectedCount,
    toggleTicketSelection,
    toggleAllTickets,
    clearSelection,
  } = useBulkTicketActions();

  const {
    dialogOpen,
    setDialogOpen,
    formData,
    setFormData,
    handleSubmit,
  } = useTicketForm(customFields, loadTickets);

  const {
    handleChangeStatus,
    handleChangePriority,
    handleDelete,
  } = useBulkTicketOperations(selectedTicketIds, () => loadTickets(page), clearSelection);
  
  useEffect(() => {
    // Проверяем, есть ли ЛЮБОЕ право на просмотр заявок
    const canViewTickets = hasPermission('tickets', 'view_all') || hasPermission('tickets', 'view_own_only');
    if (!canViewTickets) {
      navigate('/login');
    }
  }, [hasPermission, navigate]);

  // Проверяем, есть ли ЛЮБОЕ право на просмотр заявок
  const canViewTickets = hasPermission('tickets', 'view_all') || hasPermission('tickets', 'view_own_only');
  if (!canViewTickets) {
    return null;
  }

  const handleFormOpen = () => {
    loadDictionaries();
    loadServices();
  };

  const handleBulkModeToggle = () => {
    toggleBulkMode();
    if (bulkMode) {
      clearSelection();
    }
  };

  return (
    <PageLayout menuOpen={menuOpen} setMenuOpen={setMenuOpen}>
      <AppHeader menuOpen={menuOpen} setMenuOpen={setMenuOpen} />
      
      <div className="w-full flex flex-col flex-1 overflow-hidden">
        <TicketsSearch searchQuery={searchQuery} onSearchChange={setSearchQuery} />

        <TicketsViewToggle
          viewMode={viewMode}
          onViewModeChange={setViewMode}
          bulkMode={bulkMode}
          onBulkModeToggle={handleBulkModeToggle}
          showArchived={showArchived}
          onToggleArchived={toggleArchived}
          showHidden={showHidden}
          onToggleHidden={toggleHidden}
          hiddenCount={hiddenCount}
          hideWaiting={hideWaiting}
          onToggleHideWaiting={toggleHideWaiting}
        />

          {!showArchived && !showHidden && <div className="w-fit">
            <TicketForm
              dialogOpen={dialogOpen}
              setDialogOpen={setDialogOpen}
              formData={formData}
              setFormData={setFormData}
              categories={categories}
              priorities={priorities}
              statuses={statuses}
              departments={departments}
              customFields={customFields}
              services={services}
              ticketServices={ticketServices}
              handleSubmit={handleSubmit}
              onDialogOpen={handleFormOpen}
              canCreate={hasPermission('tickets', 'create')}
            />
          </div>}

          {viewMode === 'list' ? (
            <div className="mt-6">
              <TicketsList
                tickets={filteredTickets}
                loading={loading}
                onTicketClick={(ticket) => navigate(`/tickets/${ticket.id}`, { state: { ticket } })}
                selectedTicketIds={selectedTicketIds}
                onToggleTicket={toggleTicketSelection}
                onToggleAll={toggleAllTickets}
                bulkMode={bulkMode}
                currentUserId={user?.id}
                page={page}
                totalPages={totalPages}
                totalTickets={totalTickets}
                onPageChange={(p) => loadTickets(p)}
              />
              
              {bulkMode && selectedCount > 0 && (
                <BulkActionsBar
                  selectedCount={selectedCount}
                  statuses={statuses}
                  priorities={priorities}
                  onChangeStatus={handleChangeStatus}
                  onChangePriority={handleChangePriority}
                  onDelete={handleDelete}
                  onCancel={() => {
                    clearSelection();
                    disableBulkMode();
                  }}
                />
              )}
            </div>
          ) : (
            <div className="flex-1 min-h-0">
            <TicketsKanban
              tickets={filteredTickets}
              statuses={statuses}
              loading={loading}
              onUpdateStatus={async (ticketId, statusId) => {
                try {
                  await apiFetch('/tickets', {
                    method: 'PUT',
                    body: JSON.stringify({ id: ticketId, status_id: statusId }),
                  });
                  loadTickets();
                } catch (error) {
                  console.error('Error updating status:', error);
                }
              }}
            />
            </div>
          )}
      </div>

      <footer className="mt-auto pt-8 py-4 text-center text-xs text-muted-foreground border-t border-border/40">
        © 2026 Команда Мечты
      </footer>
    </PageLayout>
  );
};

export default Tickets;