import Icon from '@/components/ui/icon';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { useState, useRef, useEffect } from 'react';
import EmojiPicker, { EmojiClickData } from 'emoji-picker-react';
import { useMentionSearch } from '@/hooks/useMentionSearch';
import AttachmentUploader from '@/components/shared/AttachmentUploader';
import { UploadedAttachment } from '@/hooks/useFileUploader';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';

interface Comment {
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

interface User {
  id: number;
  name: string;
  email: string;
}

interface TicketCommentsProps {
  comments: Comment[];
  loadingComments: boolean;
  newComment: string;
  submittingComment: boolean;
  onCommentChange: (value: string) => void;
  onSubmitComment: (parentCommentId?: number, mentionedUserIds?: number[]) => void;
  isCustomer: boolean;
  hasAssignee: boolean;
  sendingPing: boolean;
  onSendPing: () => void;
  currentUserId?: number;
  onReaction?: (commentId: number, emoji: string) => void;
  onTogglePin?: (commentId: number) => void;
  onDeleteComment?: (commentId: number) => void | Promise<void | boolean>;
  canDeleteComments?: boolean;
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
}

const AVATAR_COLORS = [
  'bg-blue-500', 'bg-emerald-500', 'bg-amber-500', 'bg-rose-500',
  'bg-purple-500', 'bg-cyan-500', 'bg-pink-500', 'bg-indigo-500',
];

function getAvatarColor(userId: number): string {
  return AVATAR_COLORS[userId % AVATAR_COLORS.length];
}

function getInitials(name?: string): string {
  if (!name) return '?';
  const parts = name.trim().split(/\s+/);
  if (parts.length >= 2) return (parts[0][0] + parts[1][0]).toUpperCase();
  return name.slice(0, 2).toUpperCase();
}

const TicketComments = ({
  comments,
  loadingComments,
  newComment,
  submittingComment,
  onCommentChange,
  onSubmitComment,
  isCustomer,
  hasAssignee,
  sendingPing,
  onSendPing,
  currentUserId,
  onTogglePin,
  onDeleteComment,
  canDeleteComments = false,
  availableUsers = [],
  onFileUpload,
  uploadingFile = false,
  pendingAttachments = [],
  onRemoveAttachment,
  commentsBlocked = false,
  commentsBlockedMessage,
  participantIds = [],
  myLastSeenAt = null,
  onMarkRead,
}: TicketCommentsProps) => {
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [replyToComment, setReplyToComment] = useState<Comment | null>(null);
  const [showMentions, setShowMentions] = useState(false);
  const [mentionSearch, setMentionSearch] = useState('');
  const [mentionedUsers, setMentionedUsers] = useState<User[]>([]);
  const [pinnedExpanded, setPinnedExpanded] = useState(false);
  const [deleteTargetId, setDeleteTargetId] = useState<number | null>(null);
  const [deletingComment, setDeletingComment] = useState(false);

  const pinnedComments = [...comments]
    .filter((c) => c.is_pinned)
    .sort((a, b) => {
      const ta = a.pinned_at ? new Date(a.pinned_at).getTime() : 0;
      const tb = b.pinned_at ? new Date(b.pinned_at).getTime() : 0;
      return tb - ta;
    });
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const emojiPickerRef = useRef<HTMLDivElement>(null);
  const mentionsRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const frozenLastSeenRef = useRef<string | null | undefined>(undefined);
  if (frozenLastSeenRef.current === undefined && !loadingComments) {
    frozenLastSeenRef.current = myLastSeenAt ?? null;
  }
  const frozenLastSeen = frozenLastSeenRef.current;

  const sortedAsc = [...comments].sort((a, b) => {
    const ta = a.created_at ? new Date(a.created_at).getTime() : 0;
    const tb = b.created_at ? new Date(b.created_at).getTime() : 0;
    return ta - tb;
  });
  const firstNewIndex = (() => {
    if (!frozenLastSeen || !currentUserId) return -1;
    const cutoff = new Date(frozenLastSeen).getTime();
    return sortedAsc.findIndex((c) => {
      if (c.user_id === currentUserId) return false;
      const t = c.created_at ? new Date(c.created_at).getTime() : 0;
      return t > cutoff;
    });
  })();

  const pendingReadRef = useRef<Set<number>>(new Set());
  const flushTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const markedRef = useRef<Set<number>>(new Set());
  const onMarkReadRef = useRef(onMarkRead);
  useEffect(() => {
    onMarkReadRef.current = onMarkRead;
  }, [onMarkRead]);

  const flushReads = () => {
    flushTimerRef.current = null;
    const ids = Array.from(pendingReadRef.current);
    pendingReadRef.current.clear();
    if (ids.length && onMarkReadRef.current) {
      ids.forEach((id) => markedRef.current.add(id));
      onMarkReadRef.current(ids);
    }
  };

  const scheduleFlush = () => {
    if (flushTimerRef.current) return;
    flushTimerRef.current = setTimeout(flushReads, 600);
  };

  const observerRef = useRef<IntersectionObserver | null>(null);
  useEffect(() => {
    if (typeof IntersectionObserver === 'undefined') return;
    observerRef.current = new IntersectionObserver(
      (entries) => {
        let added = false;
        entries.forEach((entry) => {
          if (!entry.isIntersecting) return;
          const idAttr = (entry.target as HTMLElement).dataset.commentId;
          if (!idAttr) return;
          const id = parseInt(idAttr, 10);
          if (!id || markedRef.current.has(id)) return;
          pendingReadRef.current.add(id);
          markedRef.current.add(id);
          added = true;
          observerRef.current?.unobserve(entry.target);
        });
        if (added) scheduleFlush();
      },
      { threshold: 0.6 },
    );
    return () => {
      observerRef.current?.disconnect();
      if (flushTimerRef.current) {
        clearTimeout(flushTimerRef.current);
        flushReads();
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const observeComment = (el: HTMLDivElement | null, comment: Comment) => {
    if (!el || !observerRef.current) return;
    if (!currentUserId || comment.user_id === currentUserId) return;
    if (markedRef.current.has(comment.id)) return;
    if (comment.read_by?.includes(currentUserId)) {
      markedRef.current.add(comment.id);
      return;
    }
    observerRef.current.observe(el);
  };

  const getReadStatus = (comment: Comment): 'sent' | 'delivered' | 'read' => {
    if (!participantIds || participantIds.length === 0) return 'sent';
    const others = participantIds.filter((id) => id !== comment.user_id);
    if (others.length === 0) return 'sent';
    const readBy = new Set(comment.read_by || []);
    const readOthers = others.filter((id) => readBy.has(id));
    if (readOthers.length === 0) return 'sent';
    if (readOthers.length === others.length) return 'read';
    return 'delivered';
  };
  
  const formatDate = (dateString?: string) => {
    if (!dateString) return '';
    const date = new Date(dateString);
    return date.toLocaleDateString('ru-RU', {
      day: 'numeric',
      month: 'long',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (emojiPickerRef.current && !emojiPickerRef.current.contains(event.target as Node)) {
        setShowEmojiPicker(false);
      }
      if (mentionsRef.current && !mentionsRef.current.contains(event.target as Node)) {
        setShowMentions(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleEmojiClick = (emojiData: EmojiClickData) => {
    onCommentChange(newComment + emojiData.emoji);
    setShowEmojiPicker(false);
  };

  const handleReply = (comment: Comment) => {
    setReplyToComment(comment);
    textareaRef.current?.focus();
  };

  const handleCancelReply = () => {
    setReplyToComment(null);
  };

  const handleMention = (user: User) => {
    const cursorPos = textareaRef.current?.selectionStart || 0;
    const beforeCursor = newComment.substring(0, cursorPos);
    const afterCursor = newComment.substring(cursorPos);
    const mentionText = `@${user.name} `;
    
    const newText = beforeCursor.replace(/@\w*$/, mentionText) + afterCursor;
    onCommentChange(newText);
    
    if (!mentionedUsers.find(u => u.id === user.id)) {
      setMentionedUsers([...mentionedUsers, user]);
    }
    
    setShowMentions(false);
    setMentionSearch('');
    
    setTimeout(() => {
      if (textareaRef.current) {
        const newCursorPos = beforeCursor.replace(/@\w*$/, mentionText).length;
        textareaRef.current.selectionStart = newCursorPos;
        textareaRef.current.selectionEnd = newCursorPos;
        textareaRef.current.focus();
      }
    }, 0);
  };

  const handleTextChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const value = e.target.value;
    onCommentChange(value);

    const cursorPosition = e.target.selectionStart;
    const textBeforeCursor = value.substring(0, cursorPosition);
    const match = textBeforeCursor.match(/@(\w*)$/);

    if (match) {
      setMentionSearch(match[1]);
      setShowMentions(true);
    } else {
      setShowMentions(false);
    }
  };

  const { users: searchedUsers, loading: searchingUsers } = useMentionSearch(
    mentionSearch,
    showMentions,
  );

  const remoteAsLocal: User[] = searchedUsers
    .filter((u) => u.id !== currentUserId)
    .map((u) => ({
      id: u.id,
      name: u.full_name || u.username,
      email: u.email || '',
    }));

  const localFiltered = availableUsers.filter(
    (user) =>
      user.name.toLowerCase().includes(mentionSearch.toLowerCase()) &&
      user.id !== currentUserId,
  );

  const seen = new Set<number>();
  const filteredUsers: User[] = [...remoteAsLocal, ...localFiltered].filter((u) => {
    if (seen.has(u.id)) return false;
    seen.add(u.id);
    return true;
  });

  const handleSubmit = () => {
    const mentionedUserIds = mentionedUsers.map(u => u.id);
    onSubmitComment(replyToComment?.id, mentionedUserIds);
    setReplyToComment(null);
    setMentionedUsers([]);
  };

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files.length > 0 && onFileUpload) {
      await onFileUpload(files);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const getParentComment = (parentId?: number) => {
    if (!parentId) return null;
    return comments.find(c => c.id === parentId);
  };

  const renderCommentText = (text: string, mentioned?: number[]) => {
    if (!mentioned || mentioned.length === 0) return text;
    
    let result = text;
    mentioned.forEach(userId => {
      const user = availableUsers.find(u => u.id === userId);
      if (user) {
        result = result.replace(new RegExp(`@${user.name}`, 'g'), 
          `<span class="text-primary font-semibold">@${user.name}</span>`
        );
      }
    });
    
    return <span dangerouslySetInnerHTML={{ __html: result }} />;
  };

  return (
    <div className="lg:flex lg:flex-col lg:flex-1 lg:min-h-0">
      <div className="flex items-center gap-2 mb-4 shrink-0">
        <Icon name="MessageSquare" size={18} className="text-muted-foreground" />
        <h3 className="text-base font-semibold">Комментарии</h3>
        <span className="text-sm text-muted-foreground">({comments.length})</span>
      </div>

      {pinnedComments.length > 0 && (
        <div className="mb-3 rounded-lg border border-amber-500/30 bg-amber-500/5">
          <button
            type="button"
            onClick={() => setPinnedExpanded((v) => !v)}
            className="w-full flex items-center justify-between gap-2 px-3 py-2 text-left hover:bg-amber-500/10 transition-colors rounded-lg"
          >
            <div className="flex items-center gap-2 min-w-0">
              <Icon name="Pin" size={14} className="text-amber-500 flex-shrink-0" />
              <span className="text-xs font-semibold text-amber-500">
                Закреплено ({pinnedComments.length})
              </span>
              {!pinnedExpanded && pinnedComments[0] && (
                <span className="text-xs text-muted-foreground truncate">
                  · {pinnedComments[0].comment.slice(0, 80)}
                </span>
              )}
            </div>
            <Icon
              name="ChevronDown"
              size={14}
              className={`text-muted-foreground transition-transform ${pinnedExpanded ? 'rotate-180' : ''}`}
            />
          </button>

          {pinnedExpanded && (
            <div className="px-3 pb-3 pt-1 space-y-2 border-t border-amber-500/20">
              {pinnedComments.map((p) => (
                <div
                  key={`pinned-${p.id}`}
                  className="rounded-md bg-card border px-3 py-2"
                >
                  <div className="flex items-center justify-between gap-2 mb-1">
                    <div className="flex items-center gap-2 min-w-0">
                      {p.user_photo_url ? (
                        <img
                          src={p.user_photo_url}
                          alt={p.user_full_name || p.user_name || ''}
                          className="w-5 h-5 rounded-full object-cover flex-shrink-0"
                        />
                      ) : (
                        <div
                          className={`w-5 h-5 rounded-full ${getAvatarColor(p.user_id)} flex items-center justify-center flex-shrink-0 text-white text-[9px] font-bold`}
                        >
                          {getInitials(p.user_full_name || p.user_name)}
                        </div>
                      )}
                      <span className="text-xs font-medium truncate">
                        {p.user_full_name || p.user_name || 'Пользователь'}
                      </span>
                      <span className="text-[11px] text-muted-foreground flex-shrink-0">
                        {formatDate(p.created_at)}
                      </span>
                    </div>
                    {onTogglePin && (
                      <button
                        type="button"
                        onClick={() => onTogglePin(p.id)}
                        className="text-muted-foreground hover:text-destructive transition-colors flex-shrink-0"
                        title="Открепить"
                      >
                        <Icon name="X" size={14} />
                      </button>
                    )}
                  </div>
                  <p className="text-sm whitespace-pre-wrap break-words text-foreground">
                    {p.comment}
                  </p>
                  {p.attachments && p.attachments.length > 0 && (
                    <div className="mt-1.5 flex flex-wrap gap-1.5">
                      {p.attachments.map((file) => (
                        <a
                          key={file.id}
                          href={file.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-muted hover:bg-accent text-xs"
                        >
                          <Icon name="Paperclip" size={10} />
                          <span className="truncate max-w-[160px]">{file.filename}</span>
                        </a>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      <div className="space-y-3 lg:flex-1 lg:min-h-0 lg:overflow-y-auto lg:pr-1">
        {loadingComments ? (
          <div className="flex items-center justify-center py-8">
            <Icon name="Loader2" size={24} className="animate-spin text-muted-foreground" />
          </div>
        ) : comments.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            <Icon name="MessageSquare" size={32} className="mx-auto mb-2 opacity-50" />
            <p className="text-sm">Пока нет комментариев</p>
          </div>
        ) : (
          sortedAsc.map((comment, idx) => {
            const parentComment = getParentComment(comment.parent_comment_id);
            const isOwn = comment.user_id === currentUserId;
            const showNewDivider = idx === firstNewIndex;
            const status = isOwn ? getReadStatus(comment) : null;

            return (
              <div key={comment.id}>
                {showNewDivider && (
                  <div className="flex items-center gap-2 my-3" aria-label="Новые сообщения">
                    <div className="flex-1 h-px bg-red-500" />
                    <span className="text-[11px] font-semibold text-red-500 uppercase tracking-wide px-2 py-0.5 rounded-full bg-red-500/10 border border-red-500/30">
                      Новые сообщения
                    </span>
                    <div className="flex-1 h-px bg-red-500" />
                  </div>
                )}
                <div
                  ref={(el) => observeComment(el, comment)}
                  data-comment-id={comment.id}
                  className={`flex items-start gap-2.5 ${isOwn ? 'flex-row-reverse' : ''} ${
                    comment.parent_comment_id ? 'ml-4 lg:ml-8' : ''
                  }`}
                >
                {comment.user_photo_url ? (
                  <img src={comment.user_photo_url} alt={comment.user_full_name || comment.user_name || ''} className="w-8 h-8 rounded-full object-cover flex-shrink-0 mt-0.5" />
                ) : (
                  <div className={`w-8 h-8 rounded-full ${getAvatarColor(comment.user_id)} flex items-center justify-center flex-shrink-0 mt-0.5 text-white text-xs font-bold`}>
                    {getInitials(comment.user_full_name || comment.user_name)}
                  </div>
                )}
                <div className={`max-w-[80%] min-w-[120px]`}>
                  <div className={`flex items-baseline gap-2 mb-0.5 ${isOwn ? 'flex-row-reverse' : ''}`}>
                    <p className="font-semibold text-xs">{comment.user_full_name || comment.user_name || 'Пользователь'}</p>
                    <p className="text-[11px] text-muted-foreground">
                      {formatDate(comment.created_at)}
                    </p>
                  </div>
                  <div className={`rounded-2xl px-3.5 py-2.5 ${
                    isOwn 
                      ? 'bg-primary text-primary-foreground rounded-tr-md' 
                      : 'bg-muted text-foreground rounded-tl-md'
                  }`}>
                    {parentComment && (
                      <div className={`mb-2 pb-2 border-b ${isOwn ? 'border-primary-foreground/20' : 'border-border'}`}>
                        <div className="flex items-center gap-1.5 text-xs">
                          <Icon name="CornerDownRight" size={12} className={isOwn ? 'text-primary-foreground/60' : 'text-primary'} />
                          <span className={`font-medium ${isOwn ? 'text-primary-foreground/80' : 'text-primary'}`}>{parentComment.user_name}</span>
                        </div>
                        <p className={`text-xs line-clamp-2 mt-0.5 ${isOwn ? 'text-primary-foreground/60' : 'text-muted-foreground'}`}>{parentComment.comment}</p>
                      </div>
                    )}
                    <p className="text-sm leading-relaxed whitespace-pre-wrap break-words">
                      {renderCommentText(comment.comment, comment.mentioned_user_ids)}
                    </p>
                    
                    {comment.attachments && comment.attachments.length > 0 && (
                      <div className="mt-2 space-y-1">
                        {comment.attachments.map((file) => (
                          <a
                            key={file.id}
                            href={file.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className={`flex items-center gap-1.5 px-2 py-1 rounded-lg text-xs transition-colors ${
                              isOwn ? 'bg-primary-foreground/10 hover:bg-primary-foreground/20' : 'bg-background/50 hover:bg-background'
                            }`}
                          >
                            <Icon name="Paperclip" size={12} />
                            <span>{file.filename}</span>
                          </a>
                        ))}
                      </div>
                    )}
                  </div>
                  
                  {comment.reactions && comment.reactions.length > 0 && (
                    <div className="flex flex-wrap gap-1 mt-1.5">
                      {comment.reactions.map((reaction, rIdx) => (
                        <button
                          key={rIdx}
                          className="flex items-center gap-1 px-2 py-0.5 rounded-full bg-muted hover:bg-accent transition-colors text-xs"
                        >
                          <span>{reaction.emoji}</span>
                          <span className="text-muted-foreground">{reaction.count}</span>
                        </button>
                      ))}
                    </div>
                  )}
                  
                  <div className={`flex items-center gap-2 mt-1 ${isOwn ? 'justify-end' : ''}`}>
                    <button
                      onClick={() => handleReply(comment)}
                      className="text-xs text-muted-foreground hover:text-primary transition-colors flex items-center gap-1"
                    >
                      <Icon name="Reply" size={12} />
                      Ответить
                    </button>
                    {onTogglePin && (
                      <button
                        onClick={() => onTogglePin(comment.id)}
                        className={`text-xs transition-colors flex items-center gap-1 ${
                          comment.is_pinned
                            ? 'text-amber-500 hover:text-amber-600'
                            : 'text-muted-foreground hover:text-primary'
                        }`}
                        title={comment.is_pinned ? 'Открепить' : 'Закрепить'}
                      >
                        <Icon name="Pin" size={12} />
                        {comment.is_pinned ? 'Открепить' : 'Закрепить'}
                      </button>
                    )}
                    {canDeleteComments && onDeleteComment && (
                      <button
                        onClick={() => setDeleteTargetId(comment.id)}
                        className="text-xs text-muted-foreground hover:text-destructive transition-colors flex items-center gap-1"
                        title="Удалить комментарий"
                      >
                        <Icon name="Trash2" size={12} />
                        Удалить
                      </button>
                    )}
                    {isOwn && status && (
                      <span
                        className="inline-flex items-center"
                        title={
                          status === 'read'
                            ? 'Прочитано всеми участниками'
                            : status === 'delivered'
                            ? 'Кто-то увидел'
                            : 'Отправлено'
                        }
                      >
                        {status === 'sent' && (
                          <Icon name="Check" size={14} className="text-muted-foreground" />
                        )}
                        {status === 'delivered' && (
                          <Icon name="CheckCheck" size={14} className="text-muted-foreground" />
                        )}
                        {status === 'read' && (
                          <Icon name="CheckCheck" size={14} className="text-sky-500" />
                        )}
                      </span>
                    )}
                  </div>
                </div>
                </div>
              </div>
            );
          })
        )}
      </div>

      <div className="space-y-3 mt-6 pt-4 border-t shrink-0">
        {commentsBlocked && (
          <div className="rounded-lg border border-orange-500/40 bg-orange-500/10 p-4 flex items-start gap-3">
            <Icon name="AlertTriangle" size={20} className="text-orange-500 flex-shrink-0 mt-0.5" />
            <div>
              <p className="text-sm font-medium text-orange-400">Комментирование заблокировано</p>
              <p className="text-xs text-muted-foreground mt-1">
                {commentsBlockedMessage || 'Для продолжения работы необходимо изменить статус заявки.'}
              </p>
            </div>
          </div>
        )}
        {!commentsBlocked && replyToComment && (
          <div className="p-3 bg-primary/5 rounded-lg border border-primary">
            <div className="flex items-start justify-between gap-2">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <Icon name="CornerDownRight" size={14} className="text-primary" />
                  <span className="text-xs font-medium text-primary">Ответ на комментарий</span>
                  <span className="text-xs text-muted-foreground">{replyToComment.user_name}</span>
                </div>
                <p className="text-xs text-muted-foreground line-clamp-2">{replyToComment.comment}</p>
              </div>
              <button
                onClick={handleCancelReply}
                className="p-1 hover:bg-destructive/20 rounded transition-colors"
              >
                <Icon name="X" size={14} className="text-muted-foreground" />
              </button>
            </div>
          </div>
        )}

        {!commentsBlocked && (
          <>
            <div className="relative">
              <Textarea
                ref={textareaRef}
                placeholder="Напишите комментарий... (используйте @ для упоминания)"
                value={newComment}
                onChange={handleTextChange}
                disabled={submittingComment}
                className="min-h-[90px] lg:min-h-[120px] resize-none pr-10 text-sm"
              />

              {showMentions && (
                <div
                  ref={mentionsRef}
                  className="absolute bottom-full left-0 mb-2 w-full max-w-xs bg-popover border rounded-lg shadow-lg z-50 max-h-48 overflow-y-auto"
                >
                  {searchingUsers && filteredUsers.length === 0 && (
                    <div className="px-3 py-2 text-xs text-muted-foreground flex items-center gap-2">
                      <Icon name="Loader2" size={14} className="animate-spin" />
                      Поиск пользователей...
                    </div>
                  )}
                  {!searchingUsers && filteredUsers.length === 0 && mentionSearch && (
                    <div className="px-3 py-2 text-xs text-muted-foreground">
                      Никого не найдено
                    </div>
                  )}
                  {filteredUsers.map((user) => (
                    <button
                      key={user.id}
                      onClick={() => handleMention(user)}
                      className="w-full px-3 py-2 text-left hover:bg-accent transition-colors flex items-center gap-2"
                    >
                      <Icon name="User" size={14} className="text-muted-foreground" />
                      <div>
                        <div className="text-sm font-medium">{user.name}</div>
                        <div className="text-xs text-muted-foreground">{user.email}</div>
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </div>

            {pendingAttachments.length > 0 && onRemoveAttachment && (
              <AttachmentUploader
                attachments={pendingAttachments}
                isUploading={uploadingFile}
                onSelect={(files) => onFileUpload && onFileUpload(files)}
                onRemove={onRemoveAttachment}
                buttonLabel="Добавить ещё"
              />
            )}

            <div className="flex flex-wrap gap-2 items-center">
              <Button
                onClick={handleSubmit}
                disabled={
                  (!newComment.trim() && pendingAttachments.filter((a) => a.status === 'done').length === 0) ||
                  submittingComment ||
                  uploadingFile
                }
                size="sm"
                className="flex-1 min-w-[120px]"
              >
                {submittingComment ? (
                  <>
                    <Icon name="Loader2" size={16} className="mr-2 animate-spin" />
                    Отправка...
                  </>
                ) : (
                  <>
                    <Icon name="Send" size={16} className="mr-2" />
                    {replyToComment ? 'Ответить' : 'Отправить'}
                  </>
                )}
              </Button>

              <input
                ref={fileInputRef}
                type="file"
                multiple
                onChange={handleFileSelect}
                className="hidden"
                disabled={uploadingFile}
              />

              <Button
                onClick={() => fileInputRef.current?.click()}
                disabled={uploadingFile || submittingComment}
                variant="ghost"
                size="sm"
                className="flex-shrink-0"
                title="Прикрепить файл"
              >
                {uploadingFile ? (
                  <Icon name="Loader2" size={16} className="animate-spin" />
                ) : (
                  <Icon name="Paperclip" size={16} />
                )}
              </Button>

              <div className="relative">
                <Button
                  onClick={() => setShowEmojiPicker(!showEmojiPicker)}
                  disabled={submittingComment}
                  variant="ghost"
                  size="sm"
                  className="flex-shrink-0"
                  title="Добавить эмодзи"
                >
                  <Icon name="Smile" size={16} />
                </Button>

                {showEmojiPicker && (
                  <div ref={emojiPickerRef} className="absolute bottom-full right-0 mb-2 z-50">
                    <EmojiPicker onEmojiClick={handleEmojiClick} />
                  </div>
                )}
              </div>
            </div>
          </>
        )}
      </div>

      <AlertDialog
        open={deleteTargetId !== null}
        onOpenChange={(open) => {
          if (!open && !deletingComment) setDeleteTargetId(null);
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Удалить комментарий?</AlertDialogTitle>
            <AlertDialogDescription>
              Комментарий будет удалён без возможности восстановления.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deletingComment}>Отмена</AlertDialogCancel>
            <AlertDialogAction
              disabled={deletingComment}
              onClick={async (e) => {
                e.preventDefault();
                if (deleteTargetId === null || !onDeleteComment) return;
                try {
                  setDeletingComment(true);
                  await onDeleteComment(deleteTargetId);
                } finally {
                  setDeletingComment(false);
                  setDeleteTargetId(null);
                }
              }}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {deletingComment ? 'Удаление...' : 'Удалить'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default TicketComments;