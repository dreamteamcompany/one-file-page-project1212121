import Icon from '@/components/ui/icon';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { useState, useRef, useEffect, useCallback } from 'react';
import EmojiPicker, { EmojiClickData } from 'emoji-picker-react';

interface Comment {
  id: number;
  ticket_id: number;
  user_id: number;
  user_name?: string;
  user_email?: string;
  comment: string;
  is_internal: boolean;
  created_at?: string;
  parent_comment_id?: number;
  mentioned_user_ids?: number[];
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
  availableUsers?: User[];
  onFileUpload?: (file: File) => Promise<void>;
  uploadingFile?: boolean;
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

function formatRelativeTime(dateString?: string): string {
  if (!dateString) return '';
  const now = Date.now();
  const date = new Date(dateString).getTime();
  const diff = now - date;

  const minutes = Math.floor(diff / 60000);
  const hours = Math.floor(diff / 3600000);
  const days = Math.floor(diff / 86400000);

  if (minutes < 1) return 'только что';
  if (minutes < 60) return `${minutes} мин назад`;
  if (hours < 24) return `${hours} ч назад`;
  if (days === 1) return 'вчера';
  if (days < 7) return `${days} дн назад`;

  return new Date(dateString).toLocaleDateString('ru-RU', {
    day: 'numeric',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function shouldShowDateSeparator(current?: string, previous?: string): string | null {
  if (!current) return null;
  const currentDate = new Date(current).toLocaleDateString('ru-RU', { day: 'numeric', month: 'long', year: 'numeric' });
  if (!previous) return currentDate;
  const previousDate = new Date(previous).toLocaleDateString('ru-RU', { day: 'numeric', month: 'long', year: 'numeric' });
  return currentDate !== previousDate ? currentDate : null;
}

const DateSeparator = ({ date }: { date: string }) => (
  <div className="flex items-center gap-3 my-4">
    <div className="flex-1 h-px bg-border" />
    <span className="text-xs text-muted-foreground font-medium px-2">{date}</span>
    <div className="flex-1 h-px bg-border" />
  </div>
);

const ChatAvatar = ({ userId, userName }: { userId: number; userName?: string }) => (
  <div className={`w-8 h-8 rounded-full ${getAvatarColor(userId)} flex items-center justify-center flex-shrink-0 text-white text-xs font-bold`}>
    {getInitials(userName)}
  </div>
);

const ReplyPreview = ({ comment }: { comment: Comment }) => (
  <div className="flex items-center gap-1.5 mb-1 text-xs text-muted-foreground">
    <Icon name="CornerDownRight" size={12} className="text-primary flex-shrink-0" />
    <span className="font-medium text-primary">{comment.user_name}</span>
    <span className="truncate max-w-[200px]">{comment.comment}</span>
  </div>
);

const MessageAttachments = ({ attachments }: { attachments: Comment['attachments'] }) => {
  if (!attachments || attachments.length === 0) return null;
  return (
    <div className="mt-2 space-y-1">
      {attachments.map((file) => (
        <a
          key={file.id}
          href={file.url}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-background/50 hover:bg-background transition-colors text-xs group"
        >
          <Icon name="Paperclip" size={12} className="text-muted-foreground" />
          <span className="group-hover:text-primary transition-colors">{file.filename}</span>
        </a>
      ))}
    </div>
  );
};

const MessageReactions = ({ reactions }: { reactions: Comment['reactions'] }) => {
  if (!reactions || reactions.length === 0) return null;
  return (
    <div className="flex flex-wrap gap-1 mt-1.5">
      {reactions.map((reaction, idx) => (
        <button
          key={idx}
          className="flex items-center gap-1 px-2 py-0.5 rounded-full bg-background/50 hover:bg-background transition-colors text-xs"
        >
          <span>{reaction.emoji}</span>
          <span className="text-muted-foreground">{reaction.count}</span>
        </button>
      ))}
    </div>
  );
};

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
  availableUsers = [],
  onFileUpload,
  uploadingFile = false,
}: TicketCommentsProps) => {
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [replyToComment, setReplyToComment] = useState<Comment | null>(null);
  const [showMentions, setShowMentions] = useState(false);
  const [mentionSearch, setMentionSearch] = useState('');
  const [mentionedUsers, setMentionedUsers] = useState<User[]>([]);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const emojiPickerRef = useRef<HTMLDivElement>(null);
  const mentionsRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const chatContainerRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = useCallback(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, []);

  useEffect(() => {
    scrollToBottom();
  }, [comments.length, scrollToBottom]);

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

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      if (newComment.trim() && !submittingComment) {
        handleSubmit();
      }
    }
  };

  const filteredUsers = availableUsers.filter(user =>
    user.name.toLowerCase().includes(mentionSearch.toLowerCase()) &&
    user.id !== currentUserId
  );

  const handleSubmit = () => {
    const mentionedUserIds = mentionedUsers.map(u => u.id);
    onSubmitComment(replyToComment?.id, mentionedUserIds);
    setReplyToComment(null);
    setMentionedUsers([]);
  };

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file && onFileUpload) {
      await onFileUpload(file);
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
        result = result.replace(
          new RegExp(`@${user.name}`, 'g'),
          `<span class="text-primary font-semibold">@${user.name}</span>`
        );
      }
    });
    return <span dangerouslySetInnerHTML={{ __html: result }} />;
  };

  const sortedComments = [...comments].sort((a, b) => {
    const dateA = a.created_at ? new Date(a.created_at).getTime() : 0;
    const dateB = b.created_at ? new Date(b.created_at).getTime() : 0;
    return dateA - dateB;
  });

  const renderMessage = (comment: Comment, index: number) => {
    const isOwn = comment.user_id === currentUserId;
    const parentComment = getParentComment(comment.parent_comment_id);
    const prevComment = index > 0 ? sortedComments[index - 1] : null;
    const isConsecutive = prevComment?.user_id === comment.user_id &&
      comment.created_at && prevComment?.created_at &&
      (new Date(comment.created_at).getTime() - new Date(prevComment.created_at).getTime()) < 300000;
    const dateSeparator = shouldShowDateSeparator(comment.created_at, prevComment?.created_at ?? undefined);

    return (
      <div key={comment.id}>
        {dateSeparator && <DateSeparator date={dateSeparator} />}

        <div className={`flex gap-2.5 mb-1 ${isOwn ? 'flex-row-reverse' : ''} ${isConsecutive ? 'mt-0.5' : 'mt-3'}`}>
          {!isConsecutive ? (
            <ChatAvatar userId={comment.user_id} userName={comment.user_name} />
          ) : (
            <div className="w-8 flex-shrink-0" />
          )}

          <div className={`max-w-[75%] min-w-[100px] ${isOwn ? 'items-end' : 'items-start'}`}>
            {!isConsecutive && (
              <div className={`flex items-baseline gap-2 mb-0.5 ${isOwn ? 'flex-row-reverse' : ''}`}>
                <span className="text-xs font-semibold text-foreground">{comment.user_name || 'Пользователь'}</span>
                <span className="text-[11px] text-muted-foreground">{formatRelativeTime(comment.created_at)}</span>
              </div>
            )}

            <div
              className={`group relative rounded-2xl px-3.5 py-2 text-sm leading-relaxed ${
                isOwn
                  ? 'bg-primary text-primary-foreground rounded-tr-md'
                  : 'bg-muted text-foreground rounded-tl-md'
              } ${isConsecutive ? (isOwn ? 'rounded-tr-2xl' : 'rounded-tl-2xl') : ''}`}
            >
              {parentComment && (
                <div className={`mb-1.5 pb-1.5 border-b ${isOwn ? 'border-primary-foreground/20' : 'border-border'}`}>
                  <ReplyPreview comment={parentComment} />
                </div>
              )}

              <p className="whitespace-pre-wrap break-words">
                {renderCommentText(comment.comment, comment.mentioned_user_ids)}
              </p>

              <MessageAttachments attachments={comment.attachments} />
              <MessageReactions reactions={comment.reactions} />

              {isConsecutive && (
                <span className={`text-[10px] mt-1 block ${isOwn ? 'text-primary-foreground/60' : 'text-muted-foreground'}`}>
                  {formatRelativeTime(comment.created_at)}
                </span>
              )}

              <div className={`absolute top-1 ${isOwn ? '-left-16' : '-right-16'} opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-0.5`}>
                <button
                  onClick={() => handleReply(comment)}
                  className="p-1 rounded hover:bg-accent transition-colors"
                  title="Ответить"
                >
                  <Icon name="Reply" size={14} className="text-muted-foreground" />
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="flex flex-col h-full">
      <div
        ref={chatContainerRef}
        className="flex-1 overflow-y-auto px-1 py-2 min-h-[200px] max-h-[500px]"
      >
        {loadingComments ? (
          <div className="flex items-center justify-center py-12">
            <Icon name="Loader2" size={24} className="animate-spin text-muted-foreground" />
          </div>
        ) : comments.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
            <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center mb-3">
              <Icon name="MessageCircle" size={28} className="opacity-50" />
            </div>
            <p className="text-sm font-medium">Начните общение</p>
            <p className="text-xs mt-1">Напишите первое сообщение в чат</p>
          </div>
        ) : (
          <>
            {sortedComments.map((comment, index) => renderMessage(comment, index))}
          </>
        )}
        <div ref={messagesEndRef} />
      </div>

      <div className="border-t pt-3 mt-2">
        {isCustomer && hasAssignee && (
          <Button
            onClick={onSendPing}
            disabled={sendingPing}
            variant="outline"
            size="sm"
            className="w-full mb-3 hidden lg:flex"
          >
            {sendingPing ? (
              <>
                <Icon name="Loader2" size={14} className="mr-2 animate-spin" />
                Отправка запроса...
              </>
            ) : (
              <>
                <Icon name="Bell" size={14} className="mr-2" />
                Запросить статус
              </>
            )}
          </Button>
        )}

        {replyToComment && (
          <div className="mb-2 px-3 py-2 bg-primary/5 rounded-lg border-l-2 border-primary flex items-start justify-between gap-2">
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-1.5 mb-0.5">
                <Icon name="CornerDownRight" size={12} className="text-primary" />
                <span className="text-xs font-medium text-primary">{replyToComment.user_name}</span>
              </div>
              <p className="text-xs text-muted-foreground line-clamp-1">{replyToComment.comment}</p>
            </div>
            <button onClick={handleCancelReply} className="p-0.5 hover:bg-destructive/20 rounded transition-colors">
              <Icon name="X" size={14} className="text-muted-foreground" />
            </button>
          </div>
        )}

        <div className="flex items-end gap-2">
          <div className="flex items-center gap-0.5">
            <input ref={fileInputRef} type="file" onChange={handleFileSelect} className="hidden" disabled={uploadingFile} />
            <Button
              onClick={() => fileInputRef.current?.click()}
              disabled={uploadingFile || submittingComment}
              variant="ghost"
              size="icon"
              className="h-9 w-9 flex-shrink-0"
              title="Прикрепить файл"
            >
              {uploadingFile ? (
                <Icon name="Loader2" size={18} className="animate-spin" />
              ) : (
                <Icon name="Paperclip" size={18} />
              )}
            </Button>
          </div>

          <div className="relative flex-1">
            <Textarea
              ref={textareaRef}
              placeholder="Сообщение..."
              value={newComment}
              onChange={handleTextChange}
              onKeyDown={handleKeyDown}
              disabled={submittingComment}
              className="min-h-[40px] max-h-[120px] resize-none text-sm py-2 pr-10"
              rows={1}
            />

            {showMentions && filteredUsers.length > 0 && (
              <div
                ref={mentionsRef}
                className="absolute bottom-full left-0 mb-2 w-full max-w-xs bg-popover border rounded-lg shadow-lg z-50 max-h-48 overflow-y-auto"
              >
                {filteredUsers.map(user => (
                  <button
                    key={user.id}
                    onClick={() => handleMention(user)}
                    className="w-full px-3 py-2 text-left hover:bg-accent transition-colors flex items-center gap-2"
                  >
                    <ChatAvatar userId={user.id} userName={user.name} />
                    <div>
                      <div className="text-sm font-medium">{user.name}</div>
                      <div className="text-xs text-muted-foreground">{user.email}</div>
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>

          <div className="flex items-center gap-0.5">
            <div className="relative">
              <Button
                onClick={() => setShowEmojiPicker(!showEmojiPicker)}
                disabled={submittingComment}
                variant="ghost"
                size="icon"
                className="h-9 w-9 flex-shrink-0"
                title="Эмодзи"
              >
                <Icon name="Smile" size={18} />
              </Button>
              {showEmojiPicker && (
                <div ref={emojiPickerRef} className="absolute bottom-full right-0 mb-2 z-50">
                  <EmojiPicker onEmojiClick={handleEmojiClick} />
                </div>
              )}
            </div>

            <Button
              onClick={handleSubmit}
              disabled={!newComment.trim() || submittingComment}
              size="icon"
              className="h-9 w-9 flex-shrink-0 rounded-full"
            >
              {submittingComment ? (
                <Icon name="Loader2" size={18} className="animate-spin" />
              ) : (
                <Icon name="Send" size={18} />
              )}
            </Button>
          </div>
        </div>

        <p className="text-[11px] text-muted-foreground mt-1.5 text-center">
          Enter — отправить, Shift+Enter — новая строка
        </p>
      </div>
    </div>
  );
};

export default TicketComments;