import { useEffect, useState, useRef, useCallback, useMemo } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import Icon from '@/components/ui/icon';
import { Button } from '@/components/ui/button';
import PageLayout from '@/components/layout/PageLayout';
import TicketDetailsContent from '@/components/tickets/TicketDetailsContent';
import TicketDetailsSidebar from '@/components/tickets/TicketDetailsSidebar';
import ConfirmationOverlay from '@/components/tickets/ConfirmationOverlay';
import TicketConfirmationBlock from '@/components/tickets/TicketConfirmationBlock';
import { useTicketData } from '@/hooks/useTicketData';
import { useTicketActions } from '@/hooks/useTicketActions';

const TicketDetails = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const location = useLocation();
  const [menuOpen, setMenuOpen] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [showExitConfirmation, setShowExitConfirmation] = useState(false);
  const sidebarRef = useRef<HTMLDivElement>(null);
  const { user, hasPermission } = useAuth();

  const {
    ticket,
    statuses,
    comments,
    users,
    executorGroups,
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
    handleAssignGroup,
    handleUpdateDueDate,
  } = useTicketActions(id, loadTicket, loadComments, loadHistory);

  const canViewTickets = hasPermission('tickets', 'view_all') || hasPermission('tickets', 'view_own_only');

  const isPendingConfirmation = useMemo(
    () => !!statuses.find(s => s.id === ticket?.status_id)?.is_pending_confirmation,
    [statuses, ticket?.status_id]
  );
  const isCreator = user?.id === ticket?.created_by;
  const isAssignee = user?.id === ticket?.assigned_to;
  const isReopened = useMemo(
    () => !!statuses.find(s => s.id === ticket?.status_id)?.is_reopened,
    [statuses, ticket?.status_id]
  );
  const needsCreatorConfirmation = isPendingConfirmation && isCreator;

  const handleBack = useCallback(() => {
    if (needsCreatorConfirmation) {
      setShowExitConfirmation(true);
    } else {
      navigate('/tickets');
    }
  }, [needsCreatorConfirmation, navigate]);

  useEffect(() => {
    if (!canViewTickets) {
      navigate('/tickets');
    }
  }, [canViewTickets, navigate]);

  useEffect(() => {
    if (!needsCreatorConfirmation) return;
    const handlePopState = (e: PopStateEvent) => {
      e.preventDefault();
      window.history.pushState(null, '', window.location.href);
      setShowExitConfirmation(true);
    };
    window.history.pushState(null, '', window.location.href);
    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, [needsCreatorConfirmation]);

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
          onClick={handleBack}
        >
          <Icon name="ArrowLeft" size={20} />
        </Button>
      </div>

      {needsCreatorConfirmation && (
        <div className="mb-4 rounded-xl border-2 border-orange-500 bg-orange-500/10 p-4 relative overflow-hidden confirmation-banner-pulse">
          <div className="relative flex flex-col sm:flex-row items-start sm:items-center gap-3">
            <div className="shrink-0 w-12 h-12 rounded-full bg-orange-500/20 flex items-center justify-center animate-bounce-slow">
              <Icon name="ClipboardCheck" size={24} className="text-orange-400" />
            </div>
            <div className="flex-1 min-w-0">
              <h3 className="text-sm font-bold text-orange-400 uppercase tracking-wide">
                Требуется ваше решение
              </h3>
              <p className="text-xs text-muted-foreground mt-0.5">
                Исполнитель сообщает, что работа выполнена. Подтвердите или отклоните результат.
              </p>
            </div>
            <div className="shrink-0 flex gap-2 w-full sm:w-auto">
              <Button
                size="sm"
                className="flex-1 sm:flex-none bg-green-600 hover:bg-green-700 text-white"
                onClick={() => setShowExitConfirmation(true)}
              >
                <Icon name="CheckCircle" size={14} className="mr-1" />
                Подтвердить
              </Button>
              <Button
                size="sm"
                variant="outline"
                className="flex-1 sm:flex-none border-red-500/40 text-red-400 hover:bg-red-500/10"
                onClick={() => setShowExitConfirmation(true)}
              >
                <Icon name="XCircle" size={14} className="mr-1" />
                Отклонить
              </Button>
            </div>
          </div>
        </div>
      )}

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
              executorGroups={executorGroups}
              onUpdateStatus={(statusId) => handleUpdateStatus(Number(statusId))}
              onAssignUser={handleAssignUser}
              onAssignGroup={handleAssignGroup}
              onSendPing={handleSendPing}
              onApprovalChange={loadTicket}
              onUpdateDueDate={handleUpdateDueDate}
            />
          </div>

          <div className="lg:hidden w-full">
            <button
              type="button"
              onClick={() => setSidebarOpen(prev => !prev)}
              className="w-full flex items-center justify-between px-4 py-3 rounded-lg bg-[#1b254b]/50 border border-border text-foreground text-sm font-medium"
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
                  executorGroups={executorGroups}
                  onUpdateStatus={(statusId) => handleUpdateStatus(Number(statusId))}
                  onAssignUser={handleAssignUser}
                  onAssignGroup={handleAssignGroup}
                  onSendPing={handleSendPing}
                  onApprovalChange={loadTicket}
                  onUpdateDueDate={handleUpdateDueDate}
                  hidePing
                />
              </div>
            </div>
          </div>

          <div className="lg:hidden w-full">
            <TicketConfirmationBlock
              ticket={ticket}
              isPendingConfirmation={isPendingConfirmation}
              onChanged={loadTicket}
            />
          </div>

          <div className="lg:hidden w-full">
            <Button
              onClick={handleSendPing}
              disabled={sendingPing}
              size="lg"
              className="w-full font-semibold bg-orange-500 hover:bg-orange-600 text-white"
            >
              {sendingPing ? (
                <>
                  <Icon name="Loader2" size={18} className="mr-2 animate-spin" />
                  Отправка запроса...
                </>
              ) : (
                <>
                  <Icon name="Bell" size={18} className="mr-2" />
                  Запросить статус
                </>
              )}
            </Button>
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
            commentsBlocked={isReopened && !!isAssignee}
            commentsBlockedMessage="Заявка открыта повторно. Для работы с ней необходимо сначала принять её в работу, изменив статус."
          />
          </div>
        </div>
      </div>

      <footer className="mt-auto pt-6 py-4 text-center text-xs text-muted-foreground border-t border-border/40">
        © 2026 Команда Мечты
      </footer>

      {showExitConfirmation && (
        <ConfirmationOverlay
          ticket={ticket}
          onChanged={() => { setShowExitConfirmation(false); loadTicket(); }}
          onClose={() => setShowExitConfirmation(false)}
        />
      )}
    </PageLayout>
  );
};

export default TicketDetails;