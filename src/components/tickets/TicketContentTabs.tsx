import TicketComments from '@/components/tickets/TicketComments';
import TicketHistory from '@/components/tickets/TicketHistory';
import TicketFiles from '@/components/tickets/TicketFiles';
import { Ticket, Comment, AuditLog } from './TicketDetailsContent.types';

interface TicketContentTabsProps {
  activeTab: 'comments' | 'files' | 'history';
  setActiveTab: (tab: 'comments' | 'files' | 'history') => void;

  ticket: Ticket;
  comments: Comment[];
  loadingComments: boolean;
  newComment: string;
  submittingComment: boolean;
  sendingPing: boolean;
  userId?: number;
  onCommentChange: (value: string) => void;
  onSubmitComment: (parentCommentId?: number, mentionedUserIds?: number[], overrideText?: string) => void;
  onSendPing: () => void;
  onReaction: (commentId: number, emoji: string) => void;
  onTogglePin?: (commentId: number) => void;
  onDeleteComment?: (commentId: number) => void | Promise<void | boolean>;
  onEditComment?: (
    commentId: number,
    data: { comment?: string; created_at?: string },
  ) => Promise<boolean>;
  canDeleteComments?: boolean;
  canEditComments?: boolean;
  availableUsers?: Array<{ id: number; name: string; email: string }>;
  onFileUpload?: (fileOrFiles: File | FileList | File[]) => Promise<void>;
  uploadingFile?: boolean;
  pendingAttachments?: import('@/hooks/useFileUploader').UploadedAttachment[];
  onRemoveAttachment?: (id: string) => void;
  auditLogs: AuditLog[];
  loadingHistory: boolean;
  commentsBlocked: boolean;
  commentsBlockedMessage?: string;
  participantIds?: number[];
  myLastSeenAt?: string | null;
  onMarkRead?: (commentIds: number[]) => void;
  canUseTemplates: boolean;
  canUseAI: boolean;
}

const TicketContentTabs = ({
  activeTab,
  setActiveTab,
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
  auditLogs,
  loadingHistory,
  commentsBlocked,
  commentsBlockedMessage,
  participantIds,
  myLastSeenAt,
  onMarkRead,
  canUseTemplates,
  canUseAI,
}: TicketContentTabsProps) => {
  return (
    <div
      className="rounded-lg bg-card border mb-6 lg:mb-0 flex flex-col w-full max-w-full overflow-x-hidden"
      style={{ height: '820px', minHeight: '400px', maxHeight: '85vh', touchAction: 'pan-y' }}
    >
      <div className="flex gap-6 px-4 pt-3 border-b shrink-0">
        <button
          onClick={() => setActiveTab('comments')}
          className={`pb-2 border-b-2 text-sm font-semibold transition-all ${
            activeTab === 'comments'
              ? 'border-primary text-foreground'
              : 'border-transparent text-muted-foreground hover:text-foreground'
          }`}
        >
          Комментарии {loadingComments && comments.length === 0 ? '' : `(${comments.length})`}
        </button>
        <button
          onClick={() => setActiveTab('files')}
          className={`pb-2 border-b-2 text-sm transition-all ${
            activeTab === 'files'
              ? 'border-primary text-foreground font-semibold'
              : 'border-transparent text-muted-foreground hover:text-foreground'
          }`}
        >
          Файлы {loadingComments && comments.length === 0 ? '' : `(${comments.reduce((s, c) => s + (c.attachments?.length || 0), 0)})`}
        </button>
        <button
          onClick={() => setActiveTab('history')}
          className={`pb-2 border-b-2 text-sm transition-all ${
            activeTab === 'history'
              ? 'border-primary text-foreground font-semibold'
              : 'border-transparent text-muted-foreground hover:text-foreground'
          }`}
        >
          История ({auditLogs.length})
        </button>
      </div>

      {/* Контент вкладок */}
      <div className="p-4 flex-1 min-h-0 flex flex-col w-full max-w-full overflow-x-hidden">
        {activeTab === 'comments' && (
          <TicketComments
            comments={comments}
            loadingComments={loadingComments}
            newComment={newComment}
            submittingComment={submittingComment}
            onCommentChange={onCommentChange}
            onSubmitComment={onSubmitComment}
            isCustomer={ticket.created_by === userId}
            hasAssignee={!!ticket.assigned_to}
            sendingPing={sendingPing}
            onSendPing={onSendPing}
            currentUserId={userId}
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
            commentsBlocked={commentsBlocked}
            commentsBlockedMessage={commentsBlockedMessage}
            participantIds={participantIds}
            myLastSeenAt={myLastSeenAt}
            onMarkRead={onMarkRead}
            auditLogs={auditLogs}
            canUseTemplates={canUseTemplates}
            canUseAI={canUseAI}
          />
        )}

        {activeTab === 'files' && (
          <TicketFiles comments={comments} />
        )}

        {activeTab === 'history' && (
          <TicketHistory
            logs={auditLogs}
            loading={loadingHistory}
          />
        )}
      </div>
    </div>
  );
};

export default TicketContentTabs;
