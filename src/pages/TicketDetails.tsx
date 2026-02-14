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
    // Проверяем, есть ли ЛЮБОЕ право на просмотр заявок
    const canViewTickets = hasPermission('tickets', 'view_all') || hasPermission('tickets', 'view_own_only');
    if (!canViewTickets) {
      navigate('/tickets');
    }
  }, [hasPermission, navigate]);

  // Проверяем, есть ли ЛЮБОЕ право на просмотр заявок
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
    <PageLayout menuOpen={menuOpen} setMenuOpen={setMenuOpen}>
      {/* Mobile: компактная шапка — только гамбургер и назад */}
      <div className="flex lg:hidden items-center gap-2 mb-4">
        <Button
          variant="ghost"
          size="icon"
          onClick={() => setMenuOpen(!menuOpen)}
        >
          <Icon name="Menu" size={24} />
        </Button>
        <Button
          variant="ghost"
          size="icon"
          onClick={() => navigate('/tickets')}
          className="text-white hover:bg-white/10"
        >
          <Icon name="ArrowLeft" size={20} />
        </Button>
      </div>

      {/* Desktop: полная шапка */}
      <header className="hidden lg:flex flex-row justify-between items-center gap-4 mb-6 px-[25px] py-[18px] bg-[#1b254b]/50 backdrop-blur-[20px] rounded-[15px] border border-white/10">
        <div className="flex items-center gap-3 flex-1">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => navigate('/tickets')}
            className="text-white hover:bg-white/10"
          >
            <Icon name="ArrowLeft" size={20} />
          </Button>
          <div>
            <h1 className="text-2xl font-bold text-white">Заявка #{ticket.id}</h1>
            <p className="text-sm text-white/60">{ticket.title}</p>
          </div>
        </div>
        <div className="flex items-center gap-3 px-[15px] py-[10px] rounded-[12px] bg-white/5 border border-white/10">
          <div className="w-9 h-9 rounded-[10px] bg-gradient-to-br from-primary to-secondary flex items-center justify-center font-bold text-white text-base">
            {user?.full_name?.charAt(0) || 'U'}
          </div>
          <div>
            <div className="text-sm font-medium text-white">{user?.full_name}</div>
            <div className="text-xs text-white/60">{user?.email}</div>
          </div>
        </div>
      </header>

      <div className="flex-1 overflow-auto -mx-4 md:-mx-6 lg:-mx-[30px] px-4 md:px-6 lg:px-[30px] -mb-4 md:-mb-6 lg:-mb-[30px] pb-4 md:pb-6 lg:pb-[30px]">
        <div className="w-full py-6">
          <div className="flex flex-col lg:flex-row gap-6 lg:items-start">
          {/* Desktop: Sidebar слева */}
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

          {/* Mobile: Sidebar сверху, свёрнут по умолчанию */}
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
                  hidePing
                />
              </div>
            </div>
            {ticket.created_by === user?.id && !!ticket.assigned_to && (
              <Button
                onClick={handleSendPing}
                disabled={sendingPing}
                className="w-full mt-3 font-semibold bg-orange-500 hover:bg-orange-600 text-white"
              >
                {sendingPing ? (
                  <>
                    <Icon name="Loader2" size={16} className="mr-2 animate-spin" />
                    Отправка запроса...
                  </>
                ) : (
                  <>
                    <Icon name="Bell" size={16} className="mr-2" />
                    Запросить статус
                  </>
                )}
              </Button>
            )}
          </div>

          {/* Content: на десктопе в центре, на мобилке под сайдбаром */}
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
            auditLogs={auditLogs}
            loadingHistory={loadingHistory}
            onFileUpload={handleFileUpload}
            uploadingFile={uploadingFile}
          />
          </div>
        </div>
      </div>
    </PageLayout>
  );
};

export default TicketDetails;