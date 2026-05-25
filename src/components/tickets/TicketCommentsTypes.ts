import { UploadedAttachment } from '@/hooks/useFileUploader';
import { formatDateMSK } from '@/utils/dateFormat';
export type { HistoryLog } from './TicketEventItem';

export interface Comment {
  id: number;
  ticket_id: number;
  user_id: number;
  user_name?: string;
  user_full_name?: string;
  user_email?: string;
  user_photo_url?: string;
  comment: string;
  is_internal: boolean;
  created_at?: string;
  parent_comment_id?: number;
  mentioned_user_ids?: number[];
  read_by?: number[];
  is_pinned?: boolean;
  pinned_at?: string;
  pinned_by?: number;
  edited_at?: string;
  edited_by?: number;
  attachments?: {
    id: number;
    filename: string;
    url: string;
    size: number;
  }[];
  reactions?: {
    emoji: string;
    count: number;
    users: number[];
  }[];
}

export interface User {
  id: number;
  name: string;
  email: string;
}

export interface TicketCommentsProps {
  comments: Comment[];
  loadingComments: boolean;
  newComment: string;
  submittingComment: boolean;
  onCommentChange: (value: string) => void;
  onSubmitComment: (parentCommentId?: number, mentionedUserIds?: number[], overrideText?: string) => void;
  isCustomer: boolean;
  hasAssignee: boolean;
  sendingPing: boolean;
  onSendPing: () => void;
  currentUserId?: number;
  onReaction?: (commentId: number, emoji: string) => void;
  onTogglePin?: (commentId: number) => void;
  onDeleteComment?: (commentId: number) => void | Promise<void | boolean>;
  onEditComment?: (
    commentId: number,
    data: { comment?: string; created_at?: string },
  ) => Promise<boolean>;
  canDeleteComments?: boolean;
  canEditComments?: boolean;
  availableUsers?: User[];
  onFileUpload?: (fileOrFiles: File | FileList | File[]) => Promise<void>;
  uploadingFile?: boolean;
  pendingAttachments?: UploadedAttachment[];
  onRemoveAttachment?: (id: string) => void;
  commentsBlocked?: boolean;
  commentsBlockedMessage?: string;
  participantIds?: number[];
  myLastSeenAt?: string | null;
  onMarkRead?: (commentIds: number[]) => void;
  auditLogs?: import('./TicketEventItem').HistoryLog[];
  canUseTemplates?: boolean;
}

export const AVATAR_COLORS = [
  'bg-blue-500', 'bg-emerald-500', 'bg-amber-500', 'bg-rose-500',
  'bg-purple-500', 'bg-cyan-500', 'bg-pink-500', 'bg-indigo-500',
];

export function getAvatarColor(userId: number): string {
  return AVATAR_COLORS[userId % AVATAR_COLORS.length];
}

export function getInitials(name?: string): string {
  if (!name) return '?';
  const parts = name.trim().split(/\s+/);
  if (parts.length >= 2) return (parts[0][0] + parts[1][0]).toUpperCase();
  return name.slice(0, 2).toUpperCase();
}

export function formatDate(dateString?: string): string {
  return formatDateMSK(dateString);
}