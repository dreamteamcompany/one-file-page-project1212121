import { useState, useEffect } from 'react';
import EditTicketContentDialog from '@/components/tickets/EditTicketContentDialog';
import { useAuth } from '@/contexts/AuthContext';
import { parseServerDate, getDeadlineSeverity } from '@/utils/dateFormat';
import { TicketDetailsContentProps } from './TicketDetailsContent.types';
import TicketContentHeader from './TicketContentHeader';
import TicketCustomFields from './TicketCustomFields';
import TicketDescription from './TicketDescription';
import TicketContentTabs from './TicketContentTabs';

const TicketDetailsContent = ({
  ticket,
  comments,
  loadingComments,
  newComment,
  submittingComment,
  sendingPing,
  userId,
  onCommentChange,
  onSubmitComment,
  onSendPing,
  onReaction,
  onTogglePin,
  onDeleteComment,
  onEditComment,
  canDeleteComments,
  canEditComments,
  availableUsers,
  onFileUpload,
  uploadingFile,
  pendingAttachments,
  onRemoveAttachment,
  auditLogs = [],
  loadingHistory = false,
  commentsBlocked = false,
  commentsBlockedMessage,
  participantIds,
  myLastSeenAt,
  onMarkRead,
  onUpdateContent,
  updating,
  headerSlot,
  commentIsInternal,
  onToggleCommentInternal,
}: TicketDetailsContentProps) => {
  const { user, hasPermission, hasExactPermission, hasSystemRole } = useAuth();
  const canCallPhone = hasSystemRole('admin', 'executor');
  const isAuthor = user?.id === ticket.created_by;
  const canEditContent =
    !!onUpdateContent && (isAuthor || hasPermission('tickets', 'edit_content'));
  const [activeTab, setActiveTab] = useState<'comments' | 'files' | 'history'>('comments');
  const [copiedFieldId, setCopiedFieldId] = useState<number | null>(null);
  const [currentTime, setCurrentTime] = useState(Date.now());
  const [editContentOpen, setEditContentOpen] = useState(false);

  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentTime(Date.now());
    }, 60000);

    return () => clearInterval(interval);
  }, []);

  const formatDate = (dateString?: string) => {
    const d = parseServerDate(dateString);
    if (!d) return '';
    return d.toLocaleString('ru-RU', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      timeZone: 'Europe/Moscow',
    });
  };

  const getDeadlineInfo = (dueDate?: string) => {
    void currentTime;
    const s = getDeadlineSeverity(dueDate);
    if (!s) return null;
    return { color: s.color, label: s.label };
  };

  const deadlineInfo = getDeadlineInfo(ticket.due_date);
  const isShortDescription = !ticket.description || ticket.description.length < 500;

  return (
    <>
      <div className="flex-1 min-w-0 lg:pl-6 lg:flex lg:flex-col lg:min-h-0">
        {/* Суть заявки */}
        <div className="mb-6 border rounded-lg p-4 md:p-6 lg:pl-[18px] lg:pr-2 bg-card overflow-hidden">
          {/* Строка: заголовок + метаданные + дополнительные поля */}
          <div className={`flex flex-col ${isShortDescription ? '' : 'md:flex-row'} gap-6`}>
            <TicketContentHeader
              ticket={ticket}
              canEditContent={canEditContent}
              onOpenEdit={() => setEditContentOpen(true)}
              deadlineInfo={deadlineInfo}
              formatDate={formatDate}
              headerSlot={headerSlot}
            />

            <TicketCustomFields
              ticket={ticket}
              isShortDescription={isShortDescription}
              copiedFieldId={copiedFieldId}
              setCopiedFieldId={setCopiedFieldId}
              canCallPhone={canCallPhone}
            />
          </div>

          <TicketDescription description={ticket.description} />
        </div>

        {/* Комментарии, Файлы и История (вкладки) */}
        <TicketContentTabs
          activeTab={activeTab}
          setActiveTab={setActiveTab}
          ticket={ticket}
          comments={comments}
          loadingComments={loadingComments}
          newComment={newComment}
          submittingComment={submittingComment}
          sendingPing={sendingPing}
          userId={userId}
          onCommentChange={onCommentChange}
          onSubmitComment={onSubmitComment}
          onSendPing={onSendPing}
          onReaction={onReaction}
          onTogglePin={onTogglePin}
          onDeleteComment={onDeleteComment}
          onEditComment={onEditComment}
          canDeleteComments={canDeleteComments}
          canEditComments={canEditComments}
          availableUsers={availableUsers}
          onFileUpload={onFileUpload}
          uploadingFile={uploadingFile}
          pendingAttachments={pendingAttachments}
          onRemoveAttachment={onRemoveAttachment}
          auditLogs={auditLogs}
          loadingHistory={loadingHistory}
          commentsBlocked={commentsBlocked}
          commentsBlockedMessage={commentsBlockedMessage}
          participantIds={participantIds}
          myLastSeenAt={myLastSeenAt}
          onMarkRead={onMarkRead}
          canUseTemplates={hasExactPermission('tickets', 'use_templates')}
          canUseAI={hasSystemRole('admin', 'executor')}
          canMarkInternal={hasSystemRole('admin', 'executor')}
          commentIsInternal={commentIsInternal}
          onToggleCommentInternal={onToggleCommentInternal}
        />
      </div>
      {canEditContent && onUpdateContent && (
        <EditTicketContentDialog
          open={editContentOpen}
          onOpenChange={setEditContentOpen}
          ticket={ticket}
          updating={updating}
          onSave={onUpdateContent}
        />
      )}
    </>
  );
};

export default TicketDetailsContent;