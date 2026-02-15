import { useEffect, useState, useRef } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import Icon from '@/components/ui/icon';
import { Button } from '@/components/ui/button';
import PageLayout from '@/components/layout/PageLayout';
import TicketDetailsContent from '@/components/tickets/TicketDetailsContent';
import TicketDetailsSidebar from '@/components/tickets/TicketDetailsSidebar';
import { useTicketData } from '@/hooks/useTicketData';
import { useTicketActions } from '@/hooks/useTicketActions';

const TicketDetails = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const location = useLocation();
  const [menuOpen, setMenuOpen] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const sidebarRef = useRef<HTMLDivElement>(null);
  const { user, hasPermission } = useAuth();

  const {
    ticket,
    statuses,
    comments,
    users,
    auditLogs,
    loading,
    loadingComments,
    loadingHistory,
    loadTicket,
    loadComments,
    loadHistory,
  } = useTicketData(id, location.state?.ticket || null);

  const {
    newComment,
    setNewComment,
    submittingComment,
    updating,
    sendingPing,
    uploadingFile,
    handleSubmitComment,
    handleUpdateStatus,
    handleSendPing,
    handleReaction,
    handleFileUpload,
    handleAssignUser,
    handleUpdateDueDate,
  } = useTicketActions(id, loadTicket, loadComments, loadHistory);

  useEffect(() => {
    const canViewTickets = hasPermission('tickets', 'view_all') || hasPermission('tickets', 'view_own_only');
    if (!canViewTickets) {
      navigate('/tickets');
    }
  }, [hasPermission, navigate]);

  const canViewTickets = hasPermission('tickets', 'view_all') || hasPermission('tickets', 'view_own_only');
  if (!canViewTickets) {
    return null;
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Icon name="Loader2" size={48} className="animate-spin text-primary" />
      </div>
    );
  }

  if (!ticket) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen">
        <Icon name="FileQuestion" size={64} className="text-muted-foreground mb-4" />
        <p className="text-xl text-muted-foreground mb-4">Тикет не найден</p>
        <Button onClick={() => navigate('/tickets')}>Вернуться к списку</Button>
      </div>
    );
  }

  return (
    <PageLayout menuOpen={menuOpen} setMenuOpen={setMenuOpen} forceCollapsed>
      <div className="flex items-center gap-2 mb-2">
        <Button
          variant="ghost"
          size="icon"
          onClick={() => setMenuOpen(!menuOpen)}
          className="lg:hidden"
        >
          <Icon name="Menu" size={24} />
        </Button>
        <Button
          variant="ghost"
          size="icon"
          onClick={() => navigate('/tickets')}
        >
          <Icon name="ArrowLeft" size={20} />
        </Button>
      </div>

      <div className="flex-1 overflow-auto -mx-4 md:-mx-6 lg:-mx-[30px] px-4 md:px-6 lg:px-[30px] -mb-4 md:-mb-6 lg:-mb-[30px] pb-4 md:pb-6 lg:pb-[30px]">
        <div className="w-full py-2">
          <div className="flex flex-col lg:flex-row gap-6 lg:items-start">
          <div className="hidden lg:block">
            <TicketDetailsSidebar 
              ticket={ticket}
              statuses={statuses}
              users={users}
              updating={updating}
              sendingPing={sendingPing}
              isCustomer={ticket.created_by === user?.id}
              hasAssignee={!!ticket.assigned_to}
              onUpdateStatus={(statusId) => handleUpdateStatus(Number(statusId))}
              onAssignUser={handleAssignUser}
              onSendPing={handleSendPing}
              onApprovalChange={loadTicket}
              onUpdateDueDate={handleUpdateDueDate}
            />
          </div>

          <div className="lg:hidden w-full">
            <button
              type="button"
              onClick={() => setSidebarOpen(prev => !prev)}
              className="w-full flex items-center justify-between px-4 py-3 rounded-lg bg-[#1b254b]/50 border border-white/10 text-white text-sm font-medium"
            >
              <span className="flex items-center gap-2">
                <Icon name="Info" size={16} />
                Информация о заявке
              </span>
              <Icon
                name="ChevronDown"
                size={16}
                className={`transition-transform duration-200 ${sidebarOpen ? 'rotate-180' : ''}`}
              />
            </button>
            <div
              ref={sidebarRef}
              className="overflow-hidden transition-all duration-300 ease-in-out"
              style={{
                maxHeight: sidebarOpen ? sidebarRef.current?.scrollHeight + 'px' : '0px',
                opacity: sidebarOpen ? 1 : 0,
              }}
            >
              <div className="pt-3">
                <TicketDetailsSidebar 
                  ticket={ticket}
                  statuses={statuses}
                  users={users}
                  updating={updating}
                  sendingPing={sendingPing}
                  isCustomer={ticket.created_by === user?.id}
                  hasAssignee={!!ticket.assigned_to}
                  onUpdateStatus={(statusId) => handleUpdateStatus(Number(statusId))}
                  onAssignUser={handleAssignUser}
                  onSendPing={handleSendPing}
                  onApprovalChange={loadTicket}
                  onUpdateDueDate={handleUpdateDueDate}
                />
              </div>
            </div>
          </div>

          <TicketDetailsContent
            ticket={ticket}
            comments={comments}
            loadingComments={loadingComments}
            newComment={newComment}
            submittingComment={submittingComment}
            sendingPing={sendingPing}
            userId={user?.id}
            onCommentChange={setNewComment}
            onSubmitComment={handleSubmitComment}
            onSendPing={handleSendPing}
            onReaction={handleReaction}
            availableUsers={users}
            onFileUpload={handleFileUpload}
            uploadingFile={uploadingFile}
            auditLogs={auditLogs}
            loadingHistory={loadingHistory}
          />
          </div>
        </div>
      </div>
    </PageLayout>
  );
};

export default TicketDetails;